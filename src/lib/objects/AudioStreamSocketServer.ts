import SocketServer from "@shared/lib/objects/SocketServer.ts";
import { decodeJwt } from "@utils/api.ts";
import { bot } from "@bot/setupBot.ts";
import AudioStream, { AudioStreamEvent } from "@objects/AudioStream.ts";
import { logWs } from "@utils/generic.ts";
import { ConsoleColor } from "@shared/lib/enums/generic.ts";
import {
  AudioStreamSocketMessage,
  AudioStreamSocketMessageNames,
} from "@shared/lib/ts/audioStreamSockets.ts";

export default class AudioStreamSocketServer extends SocketServer<AudioStreamSocketMessage> {
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
    this.stream = bot.audio.streams[guildId];

    this.stream.addEventListener(AudioStreamEvent.TrackStart, () => {
      this.send(AudioStreamSocketMessageNames.TrackStartEvent);
    });

    this.stream.addEventListener(AudioStreamEvent.TrackEnd, () => {
      this.send(AudioStreamSocketMessageNames.TrackEndEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackNext, () => {
      this.send(AudioStreamSocketMessageNames.TrackNextEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackPause, () => {
      this.send(AudioStreamSocketMessageNames.TrackPauseEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackResume, () => {
      this.send(AudioStreamSocketMessageNames.TrackResumeEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackSeek, () => {
      this.send(AudioStreamSocketMessageNames.TrackSeekEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackStop, () => {
      this.send(AudioStreamSocketMessageNames.TrackStopEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.QueueAdd, (audioSource) => {
      this.send(AudioStreamSocketMessageNames.QueueAddEvent, {
        track: audioSource.sourceDetails,
      });
    });

    this.stream.addEventListener(AudioStreamEvent.QueueSkip, () => {
      this.send(AudioStreamSocketMessageNames.QueueSkipEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.FilterChange, () => {
      this.send(AudioStreamSocketMessageNames.FilterChangeEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.FilterReset, () => {
      this.send(AudioStreamSocketMessageNames.FilterResetEvent, {});
    });

    this.addEventListener("message", async ({ name, data }) => {
      if (name.includes("authenticate")) return;

      this.logEvent(
        ConsoleColor.Magenta,
        "MESSAGE",
        "-",
        name,
        ConsoleColor.Reset,
        data
      );

      switch (name) {
        case AudioStreamSocketMessageNames.PlayReq: {
          const source = await this.stream.queueTrack(data.query);
          if (!source) return;
          await source.metadataExtractionPromise;
          this.send(AudioStreamSocketMessageNames.PlayRes, {
            socketId: (data as any).socketId,
            success: !!source,
            track: source?.sourceDetails,
          });
          break;
        }

        case AudioStreamSocketMessageNames.StateReq: {
          const sources = this.stream.getQueue();

          this.send(AudioStreamSocketMessageNames.StateRes, {
            socketId: (data as any).socketId,
            success: !!sources,
            queue: sources?.map((source) => source.sourceDetails),
          });
          break;
        }
      }
    });

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

  private logEvent(color: ConsoleColor, event: string, ...text: any[]) {
    logWs(
      ConsoleColor.Cyan,
      "Web server",
      "-",
      color,
      event,
      ConsoleColor.Cyan,
      ...text,
      "",
      ConsoleColor.Cyan,
      "-",
      this.guildId,
      ConsoleColor.Reset
    );
  }

  private startStream() {
    if (!this.stream) return;

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
    if (!this.stream) return;

    console.log("WS ->", "Stream Stopped");
    this.stream.off(this.listenerId);
  }
}
