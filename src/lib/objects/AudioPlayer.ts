import {
  Bot,
  CreateMessage,
  VoiceCloseEventCodes,
  VoiceOpcodes,
} from "discordeno";
import sodium from "sodium";
import {
  AudioBot,
  VoiceWsRes,
  AudioPlayerWsServerDetails,
  AudioPlayerWsSessionDetials,
  AudioPlayerUdpServerDetails,
  AudioPlayerUdpSessionDetails,
} from "@ts/audio.ts";
import { createUserAt, isUint8Arr, log, parseTime } from "@utils/generic.ts";
import AudioSource from "@objects/AudioSource.ts";
import { FRAME_SIZE } from "@constants/audio.ts";
import { audioSourceTypeNames } from "@constants/generic.ts";
import { AudioSourceType } from "@enums/audio.ts";
import dayjs from "dayjs";
import AudioStream, { AudioStreamEvent } from "@objects/AudioStream.ts";
import EventManager from "@shared/lib/objects/EventManager.ts";

export default class AudioPlayer extends EventManager<{
  userJoin: () => void;
  userLeave: () => void;
}> {
  private bot: Bot & AudioBot;

  public readonly stream: AudioStream;

  private voiceUserChannels: Record<string, bigint> = {};

  private guildId: bigint;

  private webSocket?: WebSocket;
  private udpSocket?: Deno.DatagramConn;

  private wsServerDetails?: AudioPlayerWsServerDetails;
  private wsSessionDetails?: AudioPlayerWsSessionDetials;

  private udpServerDetails?: AudioPlayerUdpServerDetails;
  private udpSessionDetails?: AudioPlayerUdpSessionDetails;

  private heartbeatInterval?: number;
  private heartbeatTimeoutId?: number;

  private nextPacket?: Uint8Array;

  private sequence = 0;
  private timestamp = 0;

  private emptyFramesPrepared = 0;
  private isSpeaking = false;

  private broadcastChannelId?: bigint;

  constructor(bot: Bot & AudioBot, stream: AudioStream, guildId: bigint) {
    super();

    this.bot = bot;
    this.stream = stream;
    this.guildId = guildId;

    this.bindEvents();
  }

  private bindEvents() {
    this.stream.addEventListener(AudioStreamEvent.TrackStart, () => {
      this.emptyFramesPrepared = 0;
      this.broadcastUpNext();
    });
    this.stream.addEventListener(AudioStreamEvent.QueueAdd, (audioSource) =>
      this.broadcastAddedToQueue(audioSource)
    );

    this.stream.addEventListener(
      AudioStreamEvent.PacketPrepare,
      (streamPacket) => this.preparePacket(streamPacket)
    );
    this.stream.addEventListener(AudioStreamEvent.PacketDispatch, () =>
      this.dispatchPacket()
    );
  }

  public static log(type: "WS" | "UDP" | null, ...args: any[]) {
    log("[Audio Player]", type ? `${type} ->` : "", ...args);
  }

  public updateVoiceUserChannel(userId: bigint, channelId?: bigint) {
    if (!channelId) {
      delete this.voiceUserChannels[userId.toString()];
    } else {
      const currChannelId = this.voiceUserChannels[userId.toString()];

      if (currChannelId === channelId) return;

      if (channelId === this.getBotVoiceChannelId()) {
        for (const { handler } of Object.values(this.events.userJoin ?? {})) {
          handler();
        }
      } else {
        for (const { handler } of Object.values(this.events.userLeave ?? {})) {
          handler();
        }
      }

      this.voiceUserChannels[userId.toString()] = channelId;
    }
  }

  public getVoiceUserChannels() {
    return this.voiceUserChannels;
  }

  public getVoiceUserChannel(userId: bigint) {
    return this.voiceUserChannels[userId.toString()] as bigint | undefined;
  }

  public getBotVoiceChannelId() {
    return this.getVoiceUserChannel(this.bot.id);
  }

  private async broadcastUpNext() {
    const currentTrack = this.stream.getCurrentTrack();
    if (!currentTrack || !currentTrack.broadcastChannelId) return;

    await currentTrack.metadataExtractionPromise;

    const {
      url,
      type = AudioSourceType.Unknown,
      title = "Unknown",
      artist,
      album,
      duration,
      date,
    } = currentTrack.sourceDetails;

    const fields = [
      {
        name: "Pulled from",
        value: audioSourceTypeNames[type],
      },
    ];

    if (artist)
      fields.push({
        name: "Artist",
        value: artist,
      });
    if (album)
      fields.push({
        name: "Album",
        value: album,
      });

    const { hoursPadded, minutesPadded, secondsPadded } = parseTime(
      Math.floor(duration ?? 0)
    );

    const durationString = [hoursPadded, minutesPadded, secondsPadded].join(
      ":"
    );

    const submitterAt = currentTrack.submitterMemberId
      ? createUserAt(currentTrack.submitterMemberId)
      : "Unknown";

    this.bot.helpers.sendMessage(currentTrack.broadcastChannelId, {
      embeds: [
        {
          author: {
            name: "▶️ Now playing",
          },
          color: parseInt("0x3B88C3"),
          title,
          description: `Submitted by ${submitterAt}`,
          fields,
          // @ts-ignore: discordeno uses wrong type here, should be string
          timestamp: dayjs(date).format(),
          footer: duration
            ? {
                text: durationString,
              }
            : undefined,
          url,
        },
      ],
    });
  }

  private async broadcastAddedToQueue(audioSource: AudioSource) {
    const currentTrack = audioSource;
    if (!currentTrack || !currentTrack.broadcastChannelId) return;

    await currentTrack.metadataExtractionPromise;

    const {
      url,
      type = AudioSourceType.Unknown,
      title = "Unknown",
    } = currentTrack.sourceDetails;

    const submitterAt = currentTrack.submitterMemberId
      ? createUserAt(currentTrack.submitterMemberId)
      : "Unknown";

    this.bot.helpers.sendMessage(currentTrack.broadcastChannelId, {
      embeds: [
        {
          author: {
            name: "✅ Queued",
          },
          color: parseInt("0x77B255"),
          title,
          description: `Submitted by ${submitterAt}`,
          url,
          fields: [
            {
              name: "Pulled from",
              value: audioSourceTypeNames[type],
            },
          ],
        },
      ],
    });
  }

  private async broadcast(options: CreateMessage) {
    if (!this.broadcastChannelId) return;
    return await this.bot.helpers.sendMessage(this.broadcastChannelId, options);
  }

  public setBroadcastChannel(broadcastChannelId?: bigint) {
    this.broadcastChannelId = broadcastChannelId;
  }

  public canPrepare() {
    return (
      this.stream.canPrepare() &&
      !!this.webSocket &&
      !!this.udpServerDetails &&
      !!this.udpSessionDetails &&
      !!this.wsServerDetails &&
      !!this.wsSessionDetails
    );
  }

  public canDispatch() {
    return this.stream.canDispatch() && this.nextPacket;
  }

  public async preparePacket(sourcePacket?: Uint8Array) {
    if (!this.udpServerDetails || !this.udpSessionDetails) {
      if (this.isSpeaking) this.isSpeaking = false;
      return;
    }

    let streamPacket = sourcePacket;

    if (!streamPacket) {
      if (this.emptyFramesPrepared < 5) {
        streamPacket = new Uint8Array([0xf8, 0xff, 0xfe]);

        this.emptyFramesPrepared++;

        AudioPlayer.log(
          "UDP",
          `Prepared empty packet ${this.emptyFramesPrepared}`
        );
      } else {
        if (this.isSpeaking) this.ws.speaking(false);
        return;
      }
    } else {
      if (!this.isSpeaking) this.ws.speaking(true);
    }

    this.sequence++;
    this.timestamp += FRAME_SIZE;
    this.sequence %= 2 ** 16;
    this.timestamp %= 2 ** 32;

    const headerBuffer = new ArrayBuffer(12);
    const headerDataView = new DataView(headerBuffer);

    headerDataView.setUint8(0, 0x80); // 1
    headerDataView.setUint8(1, 0x78); // 2
    headerDataView.setUint16(2, this.sequence, false); // 4
    headerDataView.setUint32(4, this.timestamp, false); // 8
    headerDataView.setUint32(8, this.udpServerDetails.ssrc, false); // 12

    const headerPacket = new Uint8Array(headerBuffer);

    const noncePacket = new Uint8Array(24);
    noncePacket.set(headerPacket, 0);

    const encryptedChunk = sodium.crypto_secretbox_easy(
      streamPacket,
      noncePacket,
      this.udpSessionDetails.secretKey
    );

    const audioPacket = new Uint8Array(
      encryptedChunk.length + headerPacket.length
    );

    audioPacket.set(headerPacket, 0);
    audioPacket.set(encryptedChunk, 12);

    this.nextPacket = audioPacket;
  }

  public async dispatchPacket() {
    if (!this.udpSocket) return;
    if (!this.udpServerDetails) return;
    if (!this.udpSessionDetails) return;
    if (!this.nextPacket) return;

    try {
      this.udpSocket.send(this.nextPacket, {
        hostname: this.udpServerDetails.ip,
        port: this.udpServerDetails.port,
        transport: "udp",
      });
    } catch (err: any) {
      console.error("Unable to send over udp socket.", err);
    }
  }

  public async joinChannel(bot: Bot, channelId: bigint) {
    if (this.getVoiceUserChannel(bot.id) === channelId) return;
    this.resetSession();
    return await bot.helpers.connectToVoiceChannel(this.guildId, channelId);
  }

  public async leaveChannel() {
    await this.bot.helpers.leaveVoiceChannel(this.guildId);
  }

  public setWsServerDetails(wsServerDetails: AudioPlayerWsServerDetails) {
    this.wsServerDetails = wsServerDetails;

    this.tryInitSocket();
  }

  public setWsSessionDetails(wsSessionDetails: AudioPlayerWsSessionDetials) {
    this.wsSessionDetails = wsSessionDetails;

    this.tryInitSocket();
  }

  public closeSession() {
    this.webSocket?.close();
    this.webSocket = undefined;
    this.udpSocket?.close();
    this.udpSocket = undefined;

    this.udpServerDetails = undefined;
    this.udpSessionDetails = undefined;

    this.heartbeatInterval = undefined;

    this.stopHeartbeat();
  }

  public async resetSession() {
    this.closeSession();

    this.wsServerDetails = undefined;
    this.wsSessionDetails = undefined;

    await this.bot.helpers.leaveVoiceChannel(this.guildId);
  }

  private async tryInitSocket() {
    if (!this.wsServerDetails || !this.wsSessionDetails || this.webSocket)
      return;

    await this.initUdpSocket();
    this.initWebSocket();
  }

  private tryReconnect() {
    this.closeSession();
    this.tryInitSocket();
  }

  private initWebSocket() {
    if (!this.wsServerDetails)
      return console.error("Missing WS server detials");

    const { endpoint } = this.wsServerDetails;

    this.webSocket = new WebSocket(`wss://${endpoint}`);

    this.webSocket.addEventListener("error", (event) => {
      AudioPlayer.log("WS", "Socket error", event);
    });

    this.webSocket.addEventListener("open", () => {
      AudioPlayer.log("WS", "Socket open");

      this.ws.idenfity();
    });

    this.webSocket.addEventListener("close", (event) => {
      this.handleWebSocketClose(event.code);
    });

    this.webSocket.addEventListener("message", async (message) => {
      this.handleWebSocketRes(JSON.parse(message.data));
    });
  }

  private async initUdpSocket() {
    let port = 1000;
    const maxPort = 5000;

    while (port <= maxPort) {
      try {
        this.udpSocket = Deno.listenDatagram({
          hostname: "0.0.0.0",
          port,
          transport: "udp",
        });
        AudioPlayer.log("UDP", "Found port", port, "binding...");
        return;
      } catch (_err) {
        port++;
      }
    }

    AudioPlayer.log(
      "UDP",
      "Exceeded max port range - halting bot audio playback",
      1001
    );

    await this.resetSession();
    await this.leaveChannel();

    await this.broadcast({
      content: "Max connections has been succeeded, please try again later.",
    });
  }

  private handleWebSocketRes({ op, d }: VoiceWsRes) {
    AudioPlayer.log("WS", `Received op code: ${op}`);

    switch (op) {
      case VoiceOpcodes.Ready: {
        AudioPlayer.log(
          "WS",
          "Identification successful, performing UDP discovery..."
        );

        const { ssrc, ip, port } = d;

        this.udpServerDetails = {
          ip,
          port,
          ssrc,
        };

        this.performUdpDiscovery();

        break;
      }
      case VoiceOpcodes.Resumed: {
        AudioPlayer.log("WS", "Connection resumed.");

        break;
      }
      case VoiceOpcodes.Hello: {
        AudioPlayer.log("WS", "Received hello, starting hearbeat.");

        const { heartbeat_interval } = d;

        this.heartbeatInterval = heartbeat_interval - 100;

        this.startHeartbeat();

        break;
      }
      case VoiceOpcodes.SessionDescription: {
        AudioPlayer.log("WS", "UDP connection established.");

        const { video_codec, secret_key, mode, media_session_id, audio_codec } =
          d;

        this.udpSessionDetails = {
          videoCodec: video_codec,
          secretKey: new Uint8Array(secret_key),
          mode,
          mediaSessionId: media_session_id,
          audioCodec: audio_codec,
        };

        break;
      }
      case VoiceOpcodes.Heartbeat: {
        AudioPlayer.log("WS", "Heartbeat successful.", { nonce: d });
      }
    }
  }

  private handleWebSocketClose(code: number) {
    AudioPlayer.log("WS", "Socket closed with code: ", code);

    switch (code) {
      case VoiceCloseEventCodes.SessionNoLongerValid: {
        AudioPlayer.log(
          "WS",
          "Session no longer valid, starting new session..."
        );

        this.tryReconnect();

        break;
      }
      case VoiceCloseEventCodes.SessionTimedOut: {
        AudioPlayer.log("WS", "Session timed out, starting new session...");

        this.tryReconnect();

        break;
      }
      case VoiceCloseEventCodes.Disconnect: {
        AudioPlayer.log("WS", "Disconnected, not reconnecting.");

        // do not reconnect

        this.resetSession();

        break;
      }
      case VoiceCloseEventCodes.VoiceServerCrashed: {
        // try to resume

        AudioPlayer.log("WS", "Voice server crashed, trying to resume...");

        this.ws.resume();

        break;
      }
      default: {
        // try to resume

        AudioPlayer.log("WS", "Unknown error code, trying to reconnect...");

        this.tryReconnect();

        break;
      }
    }
  }

  private async performUdpDiscovery() {
    if (!this.udpSocket) return console.error("Missing UDP socket");
    if (!this.udpServerDetails)
      return console.error("Missing UDP server detials");
    if (!this.webSocket) return console.error("Missing web socket");
    const { ssrc, ip, port } = this.udpServerDetails;

    const buffer = new ArrayBuffer(74);
    const headerData = new DataView(buffer);

    headerData.setInt16(0, 0x1, false);
    headerData.setInt16(2, 70, false);
    headerData.setInt32(4, ssrc, false);

    AudioPlayer.log("UDP", "Performing UDP discovery", { ip, port });

    try {
      this.udpSocket.send(new Uint8Array(buffer), {
        transport: "udp",
        port: port,
        hostname: ip,
      });
    } catch (err: any) {
      console.error("Unable to send over udp socket.", err);
    }

    for (const message of await this.udpSocket.receive()) {
      if (!isUint8Arr(message)) continue;

      const localAddress = new TextDecoder().decode(
        message.slice(8, message.indexOf(0, 8))
      );
      const localPort = new DataView(message.buffer).getUint16(72, false);

      AudioPlayer.log("UDP", "UDP discovery successful", {
        localAddress,
        localPort,
      });

      this.ws.selectProtocol(localAddress, localPort);

      break;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval == null)
      return console.error("Missing heartbeat interval");

    const interval = this.heartbeatInterval;
    let lastSentAt = Date.now();

    clearTimeout(this.heartbeatTimeoutId);

    const send = () => {
      if (!this.webSocket) return console.error("Missing web socket");

      lastSentAt = Date.now();

      this.ws.heartbeat();

      this.heartbeatTimeoutId = setTimeout(
        send,
        interval + (lastSentAt - Date.now())
      );
    };

    this.heartbeatTimeoutId = setTimeout(
      send,
      interval + (lastSentAt - Date.now())
    );
  }

  private stopHeartbeat() {
    clearTimeout(this.heartbeatTimeoutId);
  }

  private wsSend(payload: Record<any, any>) {
    if (!this.webSocket)
      return console.error("Cannot send, missing web socket");

    if (
      [WebSocket.CLOSED, WebSocket.CLOSING, WebSocket.CONNECTING].includes(
        this.webSocket.readyState
      )
    ) {
      return AudioPlayer.log(
        "WS",
        "Cannot send payload, socket state is either closed, closing or connecting."
      );
    }

    try {
      this.webSocket.send(JSON.stringify(payload));
    } catch (err: any) {
      console.error("Unable to send over websocket.", err);
    }
  }

  private ws = {
    idenfity: () => {
      if (!this.webSocket) return console.error("Missing web socket");

      if (!this.wsServerDetails)
        return console.error("Missing WS server detials");
      if (!this.wsSessionDetails)
        return console.error("Missing ws session details");

      AudioPlayer.log("WS", "Sending identity");

      const { sessionId, userId } = this.wsSessionDetails;
      const { token } = this.wsServerDetails;

      this.wsSend({
        op: VoiceOpcodes.Identify,
        d: {
          server_id: this.guildId.toString(),
          user_id: userId.toString(),
          session_id: sessionId,
          token: token,
        },
      });
    },
    resume: () => {
      if (!this.webSocket) return console.error("Missing web socket");

      if (!this.wsServerDetails)
        return console.error("Missing WS server detials");
      if (!this.wsSessionDetails)
        return console.error("Missing ws session details");

      AudioPlayer.log("WS", "Resuming connection");

      const { sessionId } = this.wsSessionDetails;
      const { token } = this.wsServerDetails;

      this.wsSend({
        op: VoiceOpcodes.Resume,
        d: {
          protocol: "udp",
          data: {
            server_id: this.guildId.toString(),
            session_id: sessionId,
            token: token,
          },
        },
      });
    },
    selectProtocol: (address: string, port: number) => {
      if (!this.webSocket) return console.error("Missing web socket");

      AudioPlayer.log("WS", "Selecting protocol");

      this.wsSend({
        op: VoiceOpcodes.SelectProtocol,
        d: {
          protocol: "udp",
          data: {
            address,
            port,
            mode: "xsalsa20_poly1305",
          },
        },
      });
    },
    speaking: (isSpeaking: boolean) => {
      if (!this.webSocket) return console.error("Missing web socket");
      if (!this.udpServerDetails)
        return console.error("Missing UDP server details");

      if (isSpeaking === this.isSpeaking) return;

      const speaking = isSpeaking ? 1 : 0;

      this.isSpeaking = isSpeaking;

      AudioPlayer.log("WS", "Setting speaking state to", isSpeaking);

      this.wsSend({
        op: VoiceOpcodes.Speaking,
        d: {
          speaking,
          delay: 0,
          ssrc: this.udpServerDetails.ssrc,
        },
      });
    },
    heartbeat: () => {
      if (!this.webSocket) return console.error("Missing web socket");

      const nonce = Date.now();

      AudioPlayer.log("WS", "Sending heartbeat", { nonce });

      this.wsSend({
        op: VoiceOpcodes.Heartbeat,
        d: nonce,
      });
    },
  };
}
