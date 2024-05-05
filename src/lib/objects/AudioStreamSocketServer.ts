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

    this.stream.addEventListener(AudioStreamEvent.TrackNext, () => {
      this.send(AudioStreamSocketMessageNames.TrackNextEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackPause, () => {
      this.send(AudioStreamSocketMessageNames.TrackPauseEvent, {});
    });

    this.stream.addEventListener(AudioStreamEvent.TrackResume, () => {
      this.send(AudioStreamSocketMessageNames.TrackResumeEvent, {});
    });

    this.stream.addEventListener(
      AudioStreamEvent.TrackSeek,
      (trackPosition) => {
        this.send(AudioStreamSocketMessageNames.TrackSeekEvent, {
          trackPosition,
        });
      }
    );

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

    this.stream.addEventListener(AudioStreamEvent.FilterChange, (filters) => {
      this.send(AudioStreamSocketMessageNames.FilterChangeEvent, { filters });
    });

    this.stream.addEventListener(AudioStreamEvent.FilterReset, (filters) => {
      this.send(AudioStreamSocketMessageNames.FilterResetEvent, { filters });
    });

    this.addEventListener("message", async ({ name, data }) => {
      if (name.includes("authenticate") || name.includes("heartbeat")) return;

      this.logEvent(
        ConsoleColor.Magenta,
        "MESSAGE",
        "-",
        name,
        ConsoleColor.Reset,
        data
      );

      const userId = BigInt((data as any).userId);

      const botConfig = bot.configManager.getGuildConfig(BigInt(this.guildId));

      switch (name) {
        case AudioStreamSocketMessageNames.PlayReq: {
          const { defaultBroadcastChannelId } = botConfig ?? {};
          const source = await this.stream.queueTrack(
            data.query,
            defaultBroadcastChannelId
              ? BigInt(defaultBroadcastChannelId)
              : undefined,
            userId
          );
          if (!source) return;
          await source.metadataExtractionPromise;
          this.send(AudioStreamSocketMessageNames.PlayRes, {
            socketId: (data as any).socketId,
            success: !!source,
            track: source?.sourceDetails,
          });
          break;
        }

        case AudioStreamSocketMessageNames.SkipReq: {
          await this.stream.skipTrack();
          this.send(AudioStreamSocketMessageNames.SkipRes, {
            socketId: (data as any).socketId,
            success: true,
          });
          break;
        }

        case AudioStreamSocketMessageNames.StopReq: {
          await this.stream.stopTrack();
          this.send(AudioStreamSocketMessageNames.StopRes, {
            socketId: (data as any).socketId,
            success: true,
          });
          break;
        }

        case AudioStreamSocketMessageNames.PauseReq: {
          this.stream.pauseTrack();
          this.send(AudioStreamSocketMessageNames.PauseRes, {
            socketId: (data as any).socketId,
            success: true,
          });
          break;
        }

        case AudioStreamSocketMessageNames.ResumeReq: {
          this.stream.resumeTrack();
          this.send(AudioStreamSocketMessageNames.ResumeRes, {
            socketId: (data as any).socketId,
            success: true,
          });
          break;
        }

        case AudioStreamSocketMessageNames.SeekReq: {
          this.stream.seek(data.position);
          this.send(AudioStreamSocketMessageNames.SeekRes, {
            socketId: (data as any).socketId,
            success: true,
          });
          break;
        }

        case AudioStreamSocketMessageNames.SetFiltersReq: {
          await this.stream.setFilters(data.filters);
          this.send(AudioStreamSocketMessageNames.SetFiltersRes, {
            socketId: (data as any).socketId,
            success: true,
          });
          break;
        }

        case AudioStreamSocketMessageNames.StateReq: {
          const sources = this.stream.getQueue();
          const trackTime = this.stream.getCurrentTrackTime();
          const filters = this.stream.getFilters();
          const isPaused = this.stream.getIsPaused();

          this.send(AudioStreamSocketMessageNames.StateRes, {
            socketId: (data as any).socketId,
            success: !!sources,
            queue: sources?.map((source) => source.sourceDetails),
            trackTime,
            filters,
            isPaused,
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

    this.addEventListener("heartbeat", () => {
      this.logEvent(ConsoleColor.White, "HEARTBEAT");
    });

    this.addEventListener("open", () => {
      this.logEvent(ConsoleColor.Green, "OPEN");
    });

    this.addEventListener("close", (code, wasClean) => {
      this.logEvent(
        ConsoleColor.Red,
        "CLOSE",
        "-",
        code,
        "-",
        wasClean ? "clean" : "unclean"
      );
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
