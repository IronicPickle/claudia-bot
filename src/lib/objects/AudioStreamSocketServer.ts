import SocketServer from "@shared/lib/objects/SocketServer.ts";
import { decodeJwt } from "@utils/api.ts";
import { bot } from "@bot/setupBot.ts";
import AudioStream, { AudioStreamEvent } from "@objects/AudioStream.ts";
import { logWs } from "@utils/generic.ts";
import { ConsoleColor } from "@shared/lib/enums/generic.ts";

export default class AudioStreamSocketServer extends SocketServer {
  private guildId: string;

  private stream: AudioStream;

  private listenerId?: string;

  constructor(socket: WebSocket, guildId: string) {
    super(socket, async (token) => {
      const payload = await decodeJwt(token);

      if (!payload?.sub) return false;

      if (payload.sub !== "internal") return false;

      return true;
    });

    this.guildId = guildId;
    this.stream = bot.audio.streams["585619492608933888"];

    this.addEventListener("authenticated", () => {
      this.startStream();
    });

    this.addEventListener("close", () => {
      this.stopStream();
    });

    this.addEventListener("authenticated", () => {
      this.logEvent(ConsoleColor.Yellow, "AUTHENTICATED");
    });

    this.addEventListener("open", () => {
      this.logEvent(ConsoleColor.Green, "OPEN");
    });

    this.addEventListener("close", () => {
      this.logEvent(ConsoleColor.Red, "CLOSE");
    });
  }

  private logEvent(color: ConsoleColor, event: string) {
    logWs(
      ConsoleColor.Cyan,
      "Web client",
      "-",
      color,
      event,
      ConsoleColor.Cyan,
      "-",
      this.guildId,
      ConsoleColor.Reset
    );
  }

  private startStream() {
    console.log("WS ->", "Stream Started");

    this.listenerId = this.stream.on(
      AudioStreamEvent.PacketPrepare,
      (streamPacket) => {
        this.sendRaw(streamPacket);
      }
    );
  }

  private stopStream() {
    if (!this.listenerId) return;
    console.log("WS ->", "Stream Stopped");
    this.stream.off(this.listenerId);
  }
}
