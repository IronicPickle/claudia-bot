import dayjs from "dayjs";
import { AudioAsyncIterator, AudioStreamFilters } from "@ts/audio.ts";
import { log, parseTime } from "@utils/generic.ts";
import AudioSource from "@objects/AudioSource.ts";
import EventManager from "@objects/EventManager.ts";
import { iterateReader, readerFromStreamReader } from "streams";
import {
  CHANNELS,
  EMPTY_FRAME_BUFFER,
  FRAME_SIZE,
  SAMPLE_RATE,
} from "@constants/audio.ts";
import { Encoder } from "opus";

export enum AudioStreamEvent {
  TrackStart = "trackStart",
  TrackEnd = "trackEnd",
  TrackStop = "trackStop",
  TrackPause = "trackPause",
  TrackResume = "trackResume",
  TrackNext = "trackNext",
  TrackSeek = "trackSeek",

  QueueSkip = "queueSkip",
  QueueAdd = "queueAdd",

  FilterChange = "filterChange",
  FilterReset = "filterReset",

  PacketPrepare = "packetPrepare",
  PacketDispatch = "packetDispatch",
}

interface Events {
  [AudioStreamEvent.TrackStart]: () => void;
  [AudioStreamEvent.TrackEnd]: () => void;
  [AudioStreamEvent.TrackStop]: () => void;
  [AudioStreamEvent.TrackPause]: () => void;
  [AudioStreamEvent.TrackResume]: () => void;
  [AudioStreamEvent.TrackNext]: () => void;
  [AudioStreamEvent.TrackSeek]: () => void;

  [AudioStreamEvent.QueueSkip]: () => void;
  [AudioStreamEvent.QueueAdd]: (audioSource: AudioSource) => void;

  [AudioStreamEvent.FilterChange]: () => void;
  [AudioStreamEvent.FilterReset]: () => void;

  [AudioStreamEvent.PacketPrepare]: (packet: Uint8Array) => void;
  [AudioStreamEvent.PacketDispatch]: () => void;
}

export const defaultFilters: AudioStreamFilters = {
  pitch: 1,
  volume: 50,
  bass: 0,
  treble: 0,
};

export default class AudioStream extends EventManager<
  AudioStreamEvent,
  Events
> {
  private queue: AudioSource[] = [];

  private opusEncoder = new Encoder({
    sample_rate: SAMPLE_RATE,
    channels: CHANNELS,
    application: "audio",
  });

  private ffmpegProcess?: Deno.ChildProcess;
  private ffmpegStream?: ReadableStreamDefaultReader<Uint8Array>;
  private currentIterator?: AudioAsyncIterator;

  private isPaused = false;
  private emptyFramesPrepared = 0;

  private currentTrackStartedAt?: dayjs.Dayjs;

  private filters: AudioStreamFilters = defaultFilters;

  constructor() {
    super();
  }

  public static log(...args: any[]) {
    log("[Audio Stream]", ...args);
  }

  public getCurrentTrack(): AudioSource | undefined {
    return this.queue[0];
  }

  public getCurrentTrackTime() {
    if (!this.currentTrackStartedAt) return;
    return dayjs().diff(this.currentTrackStartedAt, "seconds");
  }

  private async drainCurrentIterator() {
    if (this.currentIterator?.return) await this.currentIterator.return();
  }

  private async resetCurrentIterator() {
    this.currentIterator = undefined;
  }

  private async killCurrentProcess() {
    try {
      await this.ffmpegStream?.cancel();
      await this.ffmpegProcess?.status;
    } catch (err) {
      console.error(err);
    }

    this.ffmpegProcess = undefined;
    this.ffmpegStream = undefined;
  }

  private async drainQueue() {
    for (const track of this.queue) await track.destroy();
    this.queue = [];
  }

  private async reencodeCurrentTrack(
    seconds: number | undefined = this.getCurrentTrackTime()
  ) {
    if (seconds == null) return;

    await this.prepareTrack(seconds);
  }

  public playFile(filePath: string) {
    const audioSource = AudioSource.fromPath(filePath);

    if (!audioSource) return null;

    this.queue.unshift(audioSource);
    AudioStream.log("Playing");
    if (!this.currentIterator) this.prepareTrack();
    if (this.isPaused) this.resumeTrack();
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
    AudioStream.log("Queueing");
    if (!this.currentIterator) this.prepareTrack();
    if (this.isPaused) this.resumeTrack();

    this.dispatch(AudioStreamEvent.QueueAdd, audioSource);

    return audioSource;
  }

  public async stopTrack() {
    await this.drainQueue();
    await this.drainCurrentIterator();
    await this.killCurrentProcess();
    this.dispatch(AudioStreamEvent.TrackStop);
  }

  public pauseTrack() {
    this.isPaused = true;
    this.dispatch(AudioStreamEvent.TrackPause);
  }

  public resumeTrack() {
    this.isPaused = false;

    if (this.getCurrentTrack()) this.dispatch(AudioStreamEvent.TrackResume);
  }

  public getIsPaused() {
    return this.isPaused;
  }

  public getQueue() {
    return this.queue;
  }

  public async skipTrack() {
    this.drainCurrentIterator();
    this.dispatch(AudioStreamEvent.QueueSkip);
  }

  public async seek(seconds: number) {
    this.reencodeCurrentTrack(seconds * (2 - this.filters.pitch));
    this.dispatch(AudioStreamEvent.TrackSeek);
  }

  public async setFilters(filters: Partial<AudioStreamFilters>) {
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

    this.dispatch(AudioStreamEvent.FilterChange);
  }

  public async resetFilter() {
    await this.setFilters(defaultFilters);

    this.dispatch(AudioStreamEvent.FilterReset);
  }

  private async nextTrack() {
    this.dispatch(AudioStreamEvent.TrackNext);

    await this.killCurrentProcess();

    this.resetCurrentIterator();

    if (!this.queue[0]) return;

    this.queue[0].destroy();

    this.queue.shift();
    this.prepareTrack();
  }

  public canPrepare() {
    return !this.isPaused && !!this.currentIterator;
  }

  public canDispatch() {
    return !this.isPaused && !!this.currentIterator;
  }

  private async prepareTrack(startTime = 0) {
    this.killCurrentProcess();

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    AudioStream.log("Waiting for download to finish");
    await currentTrack.downloadProcess?.output();

    if (startTime === 0) this.dispatch(AudioStreamEvent.TrackStart);

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
          },firequalizer=gain_entry='entry(0,${this.filters.bass});entry(250,${
            this.filters.bass / 2
          });entry(1000,0);entry(4000,${this.filters.treble / 2});entry(16000,${
            this.filters.treble
          })'`,

          "-ss",
          `${hours}:${minutes}:${seconds}`,

          "pipe:1",
        ],
        stdout: "piped",
      }).spawn();

      const reader = this.ffmpegProcess.stdout.getReader();

      this.ffmpegStream = reader;

      const pcmIterator = iterateReader(readerFromStreamReader(reader));

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

    const streamPacket = (await this.currentIterator.next()).value;

    if (!streamPacket) {
      if (this.emptyFramesPrepared === EMPTY_FRAME_BUFFER) {
        this.nextTrack();
        return;
      }

      this.emptyFramesPrepared++;
    } else if (this.emptyFramesPrepared !== 0) {
      this.emptyFramesPrepared = 0;
    }

    this.dispatch(AudioStreamEvent.PacketPrepare, streamPacket);
  }

  public async dispatchPacket() {
    this.dispatch(AudioStreamEvent.PacketDispatch);
  }
}
