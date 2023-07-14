import { cryptoRandomString, streamAsyncIterator } from "../../deps/deps.ts";
import {
  Bot,
  VoiceCloseEventCodes,
  VoiceOpcodes,
} from "../../deps/discordeno.ts";
import sodium from "../../deps/sodium.ts";
import {
  AudioBot,
  VoiceWsRes,
  AudioAsyncIterator,
  AudioPlayerWsServerDetails,
  AudioPlayerWsSessionDetials,
  AudioPlayerFilters,
  AudioPlayerUdpServerDetails,
  AudioPlayerUdpSessionDetails,
} from "../ts/audio.ts";
import {
  createUserAt,
  isUint8Arr,
  parseTime,
  randomNum,
} from "../utils/generic.ts";
import AudioSource from "./AudioSource.ts";
import { CHANNELS, FRAME_SIZE, SAMPLE_RATE } from "../constants/audio.ts";
import opus from "../../deps/opus.ts";
import { audioSourceTypeNames } from "../constants/generic.ts";
import { AudioSourceType } from "../enums/audio.ts";
import dayjs from "../../deps/dayjs.ts";

export const defaultFilters: AudioPlayerFilters = {
  pitch: 1,
  volume: 50,
};

export default class AudioPlayer {
  private bot: Bot & AudioBot;

  private voiceUserChannels: Record<string, bigint> = {};

  private guildId: bigint;

  private webSocket?: WebSocket;
  private udpSocket?: Deno.DatagramConn;

  private wsServerDetails?: AudioPlayerWsServerDetails;
  private wsSessionDetails?: AudioPlayerWsSessionDetials;

  private udpServerDetails?: AudioPlayerUdpServerDetails;
  private udpSessionDetails?: AudioPlayerUdpSessionDetails;

  private heartbeatInterval?: number;
  private heartbeatIntervalId?: number;

  private queue: AudioSource[] = [];

  private opusEncoder = new opus.Encoder({
    sample_rate: SAMPLE_RATE,
    channels: CHANNELS,
    application: "audio",
  });

  private ffmpegProcess?: Deno.ChildProcess;
  private ffmpegStream?: ReadableStream<Uint8Array>;
  private currentIterator?: AudioAsyncIterator;

  private isPaused = false;

  private sequence = 0;
  private timestamp = 0;

  private currentTrackStartedAt?: dayjs.Dayjs;

  private filters: AudioPlayerFilters = defaultFilters;

  private emptyFramesPrepared = 0;
  private nextPacket?: Uint8Array;
  private isSpeaking = false;

  constructor(bot: Bot & AudioBot, guildId: bigint) {
    this.bot = bot;
    this.guildId = guildId;
  }

  public static log(type: "WS" | "UDP" | null, ...args: any[]) {
    console.log("[Audio Player]", type ? `${type} ->` : "", ...args);
  }

  public updateVoiceUserChannel(userId: bigint, channelId?: bigint) {
    if (!channelId) delete this.voiceUserChannels[userId.toString()];
    else this.voiceUserChannels[userId.toString()] = channelId;
  }

  public getVoiceUserChannels() {
    return this.voiceUserChannels;
  }

  public getVoiceUserChannel(userId: bigint) {
    return this.voiceUserChannels[userId.toString()] as bigint | undefined;
  }

  public getCurrentTrack(): AudioSource | undefined {
    return this.queue[0];
  }

  public getCurrentTrackTime() {
    if (!this.currentTrackStartedAt) return;
    return dayjs().diff(this.currentTrackStartedAt, "seconds");
  }

  private async reencodeCurrentTrack(
    seconds: number | undefined = this.getCurrentTrackTime()
  ) {
    if (seconds == null) return;

    await this.skipTrack();
    this.prepareTrack(seconds);
  }

  public async queueTrack(
    query: string,
    broadcastChannelId?: bigint,
    submitterMemberId?: bigint
  ) {
    const audioSource = AudioSource.from(
      query,
      broadcastChannelId,
      submitterMemberId
    );

    if (!audioSource) return null;

    this.queue.push(audioSource);
    AudioPlayer.log(null, "Queueing");
    if (!this.currentIterator) this.prepareTrack();

    this.broadcastAddedToQueue(audioSource);

    return audioSource;
  }

  public pauseTrack() {
    this.isPaused = true;
    this.ws.speaking(false);
  }

  public resumeTrack() {
    this.isPaused = false;
    this.ws.speaking(true);
  }

  public async skipTrack() {
    if (this.currentIterator?.return) await this.currentIterator.return();
  }

  public async seek(seconds: number) {
    this.reencodeCurrentTrack(seconds * (2 - this.filters.pitch));
  }

  public async setFilters(filters: Partial<AudioPlayerFilters>) {
    const time = this.getCurrentTrackTime();
    if (time == null) return;

    const oldAdjuster = this.filters.pitch - 1;
    const oldOffset = time * oldAdjuster;

    if (oldOffset >= 0) {
      this.currentTrackStartedAt = this.currentTrackStartedAt?.subtract(
        Math.abs(oldOffset),
        "seconds"
      );
    } else {
      this.currentTrackStartedAt = this.currentTrackStartedAt?.add(
        Math.abs(oldOffset),
        "seconds"
      );
    }

    this.filters = { ...this.filters, ...filters };

    const newAdjuster = 1 - this.filters.pitch;
    const newOffset = time * newAdjuster;

    if (newOffset >= 0) {
      this.currentTrackStartedAt = this.currentTrackStartedAt?.subtract(
        Math.abs(newOffset),
        "seconds"
      );
    } else {
      this.currentTrackStartedAt = this.currentTrackStartedAt?.add(
        Math.abs(newOffset),
        "seconds"
      );
    }

    await this.reencodeCurrentTrack();
  }

  public async resetFilter() {
    await this.setFilters(defaultFilters);
  }

  private async nextTrack() {
    this.ws.speaking(false);
    this.emptyFramesPrepared = 0;

    await this.ffmpegStream?.cancel();
    await this.ffmpegProcess?.status;

    this.queue[0].destroy();

    this.queue.shift();
    this.prepareTrack();
  }

  private async broadcastUpNext() {
    const currentTrack = this.getCurrentTrack();
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

  public canPrepare() {
    return (
      !this.isPaused &&
      !!this.webSocket &&
      !!this.udpServerDetails &&
      !!this.udpSessionDetails &&
      !!this.wsServerDetails &&
      !!this.wsSessionDetails &&
      !!this.currentIterator
    );
  }

  public canDispatch() {
    return !this.isPaused && !!this.nextPacket;
  }

  private async prepareTrack(startTime = 0) {
    await this.ffmpegStream?.cancel();
    await this.ffmpegProcess?.status;

    this.nextPacket = undefined;
    this.currentIterator = undefined;
    this.ffmpegProcess = undefined;
    this.ffmpegStream = undefined;

    this.currentTrackStartedAt = undefined;

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    AudioPlayer.log(null, "Waiting for download to finish");
    await currentTrack.downloadProcess.output();

    if (this.currentIterator) return;

    if (startTime === 0) this.broadcastUpNext();

    const { hours, minutes, seconds } = parseTime(startTime);

    this.currentTrackStartedAt = dayjs().subtract(startTime, "seconds");

    try {
      this.ffmpegProcess = new Deno.Command("ffmpeg", {
        args: [
          "-i",
          currentTrack.sourceFilePath,

          "-f",
          "s16le",

          "-ac",
          CHANNELS.toString(),
          "-ar",
          SAMPLE_RATE.toString(),

          "-af",
          `asetrate=${SAMPLE_RATE}*${this.filters.pitch},volume=${
            this.filters.volume / 50
          }`,

          "-ss",
          `${hours}:${minutes}:${seconds}`,

          "pipe:1",
        ],
        stdout: "piped",
      }).spawn();

      this.ffmpegStream = this.ffmpegProcess.stdout;

      const pcmIterator = streamAsyncIterator(this.ffmpegStream);

      const opusIterator = this.opusEncoder.encode_pcm_stream(
        FRAME_SIZE,
        pcmIterator
      );

      this.currentIterator = opusIterator;
    } catch (err: any) {
      return console.error("Unable to encode audio file", err);
    }
  }

  public async preparePacket() {
    if (!this.currentIterator) return console.error("Missing current iterator");
    if (!this.udpServerDetails)
      return console.error("Missing udp server details");
    if (!this.udpSessionDetails)
      return console.error("Missing udp session details");

    if (!this.isSpeaking) this.ws.speaking(true);

    let streamPacket = (await this.currentIterator.next()).value;
    if (!streamPacket) {
      if (this.emptyFramesPrepared < 5) {
        streamPacket = new Uint8Array([0xf8, 0xff, 0xfe]);

        this.emptyFramesPrepared++;

        AudioPlayer.log(
          "UDP",
          `Prepared empty packet ${this.emptyFramesPrepared}`
        );
      } else {
        return this.nextTrack();
      }
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
    if (!this.udpSocket) return console.error("Missing udp socket");
    if (!this.udpServerDetails)
      return console.error("Missing udp server details");
    if (!this.udpSessionDetails)
      return console.error("Missing udp session details");
    if (!this.nextPacket) return console.error("Missing next packet");

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

  public joinChannel(bot: Bot, channelId: bigint) {
    if (this.getVoiceUserChannel(bot.id) === channelId) return;
    this.resetSession();
    return bot.helpers.connectToVoiceChannel(this.guildId, channelId);
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
    this.pauseTrack();

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

  private tryInitSocket() {
    if (!this.wsServerDetails || !this.wsSessionDetails || this.webSocket)
      return;

    this.initWebSocket();
    this.initUdpSocket();
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

  private initUdpSocket() {
    const port = randomNum(1000, 5000);

    this.udpSocket = Deno.listenDatagram({
      hostname: "0.0.0.0",
      port,
      transport: "udp",
    });
  }

  private handleWebSocketRes({ op, d }: VoiceWsRes) {
    AudioPlayer.log("WS", `Received op code: ${op}`);

    this.resumeTrack();

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

        this.heartbeatInterval = heartbeat_interval;

        this.startHeartbeat();

        break;
      }
      case VoiceOpcodes.SessionDescription: {
        AudioPlayer.log("WS", "UDP discovery successful.");

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
      case VoiceOpcodes.HeartbeatACK: {
        AudioPlayer.log("WS", "Heartbeat successful.", { nonce: d });
      }
    }
  }

  private handleWebSocketClose(code: number) {
    AudioPlayer.log("WS", "Socket closed with code: ", code);

    this.pauseTrack();

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
    if (!this.heartbeatInterval)
      return console.error("Missing heartbeat interval");

    this.heartbeatIntervalId = setInterval(() => {
      if (!this.webSocket) return console.error("Missing web socket");

      this.ws.heartbeat();
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    clearInterval(this.heartbeatIntervalId);
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

      AudioPlayer.log("WS", "Sending heartbeat");

      this.wsSend({
        op: VoiceOpcodes.Heartbeat,
        d: parseInt(
          cryptoRandomString({
            length: 13,
            type: "numeric",
          })
        ),
      });
    },
  };
}
