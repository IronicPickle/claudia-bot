import { cryptoRandomString, streamAsyncIterator } from "../../deps/deps.ts";
import { Bot, VoiceOpcodes } from "../../deps/discordeno.ts";
import sodium from "../../deps/sodium.ts";
import { AudioBot, VoiceWsRes, AudioAsyncIterator } from "../ts/audio.ts";
import { isUint8Arr, parseTime } from "../utils/generic.ts";
import AudioSource from "./AudioSource.ts";
import { CHANNELS, FRAME_SIZE, SAMPLE_RATE } from "../constants/audio.ts";
import opus from "../../deps/opus.ts";
import { audioSourceTypeNames } from "../constants/generic.ts";
import { AudioSourceType } from "../enums/audio.ts";
import dayjs from "../../deps/dayjs.ts";

const encoder = new opus.Encoder({
  sample_rate: SAMPLE_RATE,
  channels: CHANNELS,
  application: "audio",
});

interface WsServerDetails {
  token: string;
  endpoint: string;
}

interface WsSessionDetials {
  channelId: bigint;
  sessionId: string;
  userId: bigint;
}

interface UdpServerDetails {
  ip: string;
  port: number;
  ssrc: number;
}

interface UdpSessionDetails {
  videoCodec: string;
  secretKey: Uint8Array;
  mode: string;
  mediaSessionId: string;
  audioCodec: string;
}

const udpSocket = Deno.listenDatagram({
  hostname: "0.0.0.0",
  port: 5000,
  transport: "udp",
});

export default class AudioPlayer {
  private bot: Bot & AudioBot;

  private voiceUserChannels: Record<string, bigint> = {};

  private guildId: bigint;

  private webSocket?: WebSocket;

  private wsServerDetails?: WsServerDetails;
  private wsSessionDetails?: WsSessionDetials;

  private udpServerDetails?: UdpServerDetails;
  private udpSessionDetails?: UdpSessionDetails;

  private heartbeatInterval?: number;
  private heartbeatIntervalId?: number;

  private queue: AudioSource[] = [];

  private ffmpegProcess?: Deno.ChildProcess;
  private ffmpegStream?: ReadableStream<Uint8Array>;
  private currentIterator?: AudioAsyncIterator;

  private sequence = 0;
  private timestamp = 0;

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

  public async queueTrack(query: string, broadcastChannelId?: bigint) {
    const audioSource = await AudioSource.from(query, broadcastChannelId);

    if (!audioSource) return null;

    this.queue.push(audioSource);
    AudioPlayer.log(null, "Queueing");
    if (!this.currentIterator) this.prepareTrack();

    this.broadcastAddedToQueue(audioSource);

    return audioSource;
  }

  public async skipTrack() {
    if (this.currentIterator?.return) await this.currentIterator.return();
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

    const fields = [];
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

    this.bot.helpers.sendMessage(currentTrack.broadcastChannelId, {
      content: "> **Now playing**",
      embeds: [
        {
          title,
          description: `Pulled from ${audioSourceTypeNames[type]}`,
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
    } = currentTrack?.sourceDetails;

    this.bot.helpers.sendMessage(currentTrack.broadcastChannelId, {
      content: "> **Queued**",
      embeds: [
        {
          title,
          description: `Pulled from ${audioSourceTypeNames[type]}`,
          url,
        },
      ],
    });
  }

  public canPrepare() {
    return (
      !!this.webSocket &&
      !!this.udpServerDetails &&
      !!this.udpSessionDetails &&
      !!this.wsServerDetails &&
      !!this.wsSessionDetails &&
      !!this.currentIterator
    );
  }

  public canDispatch() {
    return !!this.nextPacket;
  }

  private async prepareTrack() {
    this.nextPacket = undefined;
    this.currentIterator = undefined;
    this.ffmpegProcess = undefined;
    this.ffmpegStream = undefined;

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    AudioPlayer.log(null, "Waiting for download to finish");
    await currentTrack.downloadProcess.output();

    this.broadcastUpNext();

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

          "pipe:1",
        ],
        stdout: "piped",
      }).spawn();

      this.ffmpegStream = this.ffmpegProcess.stdout;

      const pcmIterator = streamAsyncIterator(this.ffmpegStream);

      const opusIterator = encoder.encode_pcm_stream(FRAME_SIZE, pcmIterator);

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
    if (!this.udpServerDetails)
      return console.error("Missing udp server details");
    if (!this.udpSessionDetails)
      return console.error("Missing udp session details");
    if (!this.nextPacket) return console.error("Missing next packet");

    udpSocket.send(this.nextPacket, {
      hostname: this.udpServerDetails.ip,
      port: this.udpServerDetails.port,
      transport: "udp",
    });
  }

  public joinChannel(bot: Bot, channelId: bigint) {
    if (this.getVoiceUserChannel(bot.id) === channelId) return;
    this.closeSockets();
    return bot.helpers.connectToVoiceChannel(this.guildId, channelId);
  }

  public setWsServerDetails(wsServerDetails: WsServerDetails) {
    this.wsServerDetails = wsServerDetails;

    this.tryInitSockets();
  }

  public setWsSessionDetails(wsSessionDetails: WsSessionDetials) {
    this.wsSessionDetails = wsSessionDetails;

    this.tryInitSockets();
  }

  public closeSockets() {
    this.wsSessionDetails = undefined;
    this.udpSessionDetails = undefined;

    this.wsServerDetails = undefined;
    this.udpServerDetails = undefined;

    this.heartbeatInterval = undefined;
    this.stopHeartbeat();

    this.webSocket = undefined;
  }

  private tryInitSockets() {
    if (!this.wsServerDetails || !this.wsSessionDetails || this.webSocket)
      return false;

    this.initWebSocket();

    return true;
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

    this.webSocket.addEventListener("message", async (message) => {
      this.handleWebSocketRes(JSON.parse(message.data));
    });
  }

  private handleWebSocketRes({ op, d }: VoiceWsRes) {
    AudioPlayer.log("WS", `Received op code: ${op}`);

    switch (op) {
      case VoiceOpcodes.Ready: {
        const { ssrc, ip, port } = d;

        this.udpServerDetails = {
          ip,
          port,
          ssrc,
        };

        this.performUdpDiscovery();

        break;
      }
      case VoiceOpcodes.Hello: {
        const { heartbeat_interval } = d;

        this.heartbeatInterval = heartbeat_interval;

        this.startHeartbeat();

        break;
      }
      case VoiceOpcodes.SessionDescription: {
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
    }
  }

  private async performUdpDiscovery() {
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

    udpSocket.send(new Uint8Array(buffer), {
      transport: "udp",
      port: port,
      hostname: ip,
    });

    for (const message of await udpSocket.receive()) {
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

      this.webSocket.send(
        JSON.stringify({
          op: VoiceOpcodes.Identify,
          d: {
            server_id: this.guildId.toString(),
            user_id: userId.toString(),
            session_id: sessionId,
            token: token,
          },
        })
      );
    },
    selectProtocol: (address: string, port: number) => {
      if (!this.webSocket) return console.error("Missing web socket");

      AudioPlayer.log("WS", "Selecting protocol");

      this.webSocket.send(
        JSON.stringify({
          op: VoiceOpcodes.SelectProtocol,
          d: {
            protocol: "udp",
            data: {
              address,
              port,
              mode: "xsalsa20_poly1305",
            },
          },
        })
      );
    },
    speaking: (isSpeaking: boolean) => {
      if (!this.webSocket) return console.error("Missing web socket");
      if (!this.udpServerDetails)
        return console.error("Missing UDP server details");

      const speaking = isSpeaking ? 1 : 0;

      this.isSpeaking = isSpeaking;

      AudioPlayer.log("WS", "Setting speaking state to", isSpeaking);

      this.webSocket.send(
        JSON.stringify({
          op: VoiceOpcodes.Speaking,
          d: {
            speaking,
            delay: 0,
            ssrc: this.udpServerDetails.ssrc,
          },
        })
      );
    },

    heartbeat: () => {
      if (!this.webSocket) return console.error("Missing web socket");

      AudioPlayer.log("WS", "Sending heartbeat");

      this.webSocket.send(
        JSON.stringify({
          op: VoiceOpcodes.Heartbeat,
          d: parseInt(
            cryptoRandomString({
              length: 13,
              type: "numeric",
            })
          ),
        })
      );
    },
  };
}
