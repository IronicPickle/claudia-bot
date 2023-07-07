import { iterateReader } from "https://deno.land/std@0.152.0/streams/conversion.ts";
import { cryptoRandomString, opus } from "../../deps/deps.ts";
import { Bot, VoiceOpcodes } from "../../deps/discordeno.ts";
import sodium from "../../deps/sodium.ts";
import { AudioBot, VoiceWsRes } from "../ts/audioBot.ts";
import { isUint8Arr } from "../utils/generic.ts";
import AudioTrack from "./AudioTrack.ts";
import { CHANNELS, FRAME_SIZE, SAMPLE_RATE } from "../constants/audio.ts";

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

export default class AudioPlayer {
  private bot: Bot & AudioBot;

  private guildId: bigint;

  private udpSocket?: Deno.DatagramConn;
  private webSocket?: WebSocket;

  private wsServerDetails?: WsServerDetails;
  private wsSessionDetails?: WsSessionDetials;

  private udpServerDetails?: UdpServerDetails;
  private udpSessionDetails?: UdpSessionDetails;

  private heartbeatInterval?: number;
  private heartbeatIntervalId?: number;

  private queue: AudioTrack[] = [];

  private currentStream?: AsyncGenerator<Uint8Array, void, unknown>;

  private sequence = 0;
  private timestamp = 0;

  private nextPacket?: Uint8Array;

  constructor(bot: Bot & AudioBot, guildId: bigint) {
    this.bot = bot;
    this.guildId = guildId;
  }

  public getCurrentTrack(): AudioTrack | undefined {
    return this.queue[0];
  }

  public queueTrack(
    title: string,
    stream: AsyncGenerator<Uint8Array, void, unknown>
  ) {
    this.queue.push(new AudioTrack(title, stream));
    if (!this.currentStream) this.prepareTrack();
  }

  public enqueue() {
    const process = Deno.run({
      cmd: [
        "ffmpeg",
        "-i",
        "./src/test2.mp4",
        "-ac",
        CHANNELS.toString(),
        "-ar",
        SAMPLE_RATE.toString(),
        "-f",
        "s16le",
        "pipe:1",
      ],
      stdout: "piped",
    });

    const stream = new opus.Encoder({
      application: "audio",
    }).encode_pcm_stream(FRAME_SIZE, iterateReader(process.stdout));

    this.queueTrack("Test", stream);
  }

  private nextTrack() {
    this.queue.shift();
    this.prepareTrack();
  }

  public isSocketAlive() {
    return !!this.webSocket && !!this.udpSocket;
  }

  private prepareTrack() {
    this.nextPacket = undefined;
    this.currentStream = undefined;
    this.sequence = 0;
    this.timestamp = 0;

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    this.currentStream = currentTrack.stream;

    if (!this.webSocket) return console.error("Missing web socket");
    if (!this.udpServerDetails)
      return console.error("Missing udp server details");
  }

  public async preparePacket() {
    if (!this.currentStream) return console.error("Missing current stream");
    if (!this.udpServerDetails)
      return console.error("Missing udp server details");
    if (!this.udpSessionDetails)
      return console.error("Missing udp session details");

    const streamPacket = (await this.currentStream.next()).value;
    if (!streamPacket) return this.nextTrack();

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

    console.log({
      streamPacket,
      noncePacket,
      key: this.udpSessionDetails.secretKey,
    });

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

  public async sendPacket() {
    if (!this.udpSocket) return console.error("Missing udp socket");
    if (!this.udpServerDetails)
      return console.error("Missing udp server details");
    if (!this.udpSessionDetails)
      return console.error("Missing udp session details");
    if (!this.nextPacket) return console.error("Missing next packet");

    console.log("UDP: sending -> ", this.nextPacket);

    this.udpSocket.send(this.nextPacket, {
      hostname: this.udpServerDetails.ip,
      port: this.udpServerDetails.port,
      transport: "udp",
    });
  }

  public joinChannel(bot: Bot, channelId: bigint) {
    return bot.helpers.connectToVoiceChannel(this.guildId, channelId);
  }

  public setWsServerDetails(wsServerDetails: WsServerDetails) {
    this.wsServerDetails = wsServerDetails;

    this.tryInitSockets();
  }

  public setWsSessionDetails(wsServerDetails: WsSessionDetials) {
    this.wsSessionDetails = wsServerDetails;

    this.tryInitSockets();
  }

  public closeSockets() {
    this.wsSessionDetails = undefined;
    this.udpSessionDetails = undefined;

    this.wsServerDetails = undefined;
    this.udpServerDetails = undefined;

    this.heartbeatInterval = undefined;
    this.stopHeartbeat();

    this.udpSocket = undefined;
    this.webSocket = undefined;
  }

  private tryInitSockets() {
    if (!this.wsServerDetails || !this.wsSessionDetails) return false;

    this.initWebSocket();

    return true;
  }

  private initWebSocket() {
    if (!this.wsServerDetails)
      return console.error("Missing WS server detials");
    if (!this.wsSessionDetails)
      return console.error("Missing session server detials");

    const { token, endpoint } = this.wsServerDetails;
    const { channelId, sessionId, userId } = this.wsSessionDetails;

    this.webSocket = new WebSocket(`wss://${endpoint}`);

    this.webSocket.addEventListener("error", (event) => {
      console.error("WS Error", event);
    });

    this.webSocket.addEventListener("open", () => {
      console.log("WS open");

      if (!this.webSocket) return console.error("Missing web socket");

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
    });

    this.webSocket.addEventListener("message", async (message) => {
      this.handleWebSocketRes(JSON.parse(message.data));
    });
  }

  private initUdpSocket() {
    this.udpSocket = Deno.listenDatagram({
      hostname: "0.0.0.0",
      port: 5000,
      transport: "udp",
    });
  }

  private handleWebSocketRes({ op, d }: VoiceWsRes) {
    console.log("WS:", op, "->", d);

    switch (op) {
      case VoiceOpcodes.Ready: {
        const { ssrc, ip, port } = d;

        this.udpServerDetails = {
          ip,
          port,
          ssrc,
        };

        this.initUdpSocket();
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

        this.sendSpeakingCode();

        break;
      }
    }
  }

  private sendSpeakingCode() {
    if (!this.webSocket) return console.log("Missing web socket");
    if (!this.udpServerDetails)
      return console.log("Missing udp server details");

    this.webSocket.send(
      JSON.stringify({
        op: VoiceOpcodes.Speaking,
        d: {
          speaking: 1,
          delay: 5,
          ssrc: this.udpServerDetails.ssrc,
        },
      })
    );
  }

  private async performUdpDiscovery() {
    if (!this.udpServerDetails)
      return console.error("Missing UDP server detials");
    if (!this.udpSocket) return console.error("Missing UDP socket");
    if (!this.webSocket) return console.error("Missing web socket");

    const { ssrc, ip, port } = this.udpServerDetails;

    const buffer = new ArrayBuffer(74);
    const headerData = new DataView(buffer);

    headerData.setInt16(0, 0x1, false);
    headerData.setInt16(2, 70, false);
    headerData.setInt32(4, ssrc, false);

    console.log("Peforming UDP discovery ", { ip, port, buffer });

    this.udpSocket.send(new Uint8Array(buffer), {
      transport: "udp",
      port: port,
      hostname: ip,
    });

    for (const message of await this.udpSocket.receive()) {
      if (!isUint8Arr(message)) continue;

      console.log("UDP:", message);

      const localAddress = new TextDecoder().decode(
        message.slice(8, message.indexOf(0, 8))
      );
      const localPort = new DataView(message.buffer).getUint16(72, false);

      console.log("Selecting protocol");

      this.webSocket.send(
        JSON.stringify({
          op: VoiceOpcodes.SelectProtocol,
          d: {
            protocol: "udp",
            data: {
              address: localAddress,
              port: localPort,
              mode: "xsalsa20_poly1305",
            },
          },
        })
      );
    }
  }

  private startHeartbeat() {
    if (!this.heartbeatInterval)
      return console.error("Missing heartbeat interval");

    this.heartbeatIntervalId = setInterval(() => {
      if (!this.webSocket) return console.error("Missing web socket");

      console.log("Sending heartbeat");
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
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    clearInterval(this.heartbeatIntervalId);
  }
}
