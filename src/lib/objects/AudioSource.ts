import { join } from "path";
import {
  scIdRegex,
  spotIdRegex,
  tmpDirPath,
  ytIdRegex,
} from "@constants/generic.ts";
import {
  SoundCloudMetadata,
  SpotifyMetadata,
  YoutubeMetadata,
} from "@ts/audio.ts";
import AudioPlayer from "@objects/AudioPlayer.ts";
import { AudioSourceDetails } from "@shared/lib/ts/audio.ts";
import { AudioSourceType } from "@shared/lib/enums/audio.ts";

const tmpAudioDirPath = join(tmpDirPath, "audio");

const textDecoder = new TextDecoder();

export default class AudioSource {
  public readonly query: string;
  public readonly sourceFilePath: string;
  public sourceDetails: AudioSourceDetails;

  public readonly downloadProcess?: Deno.ChildProcess;
  public metadataExtractionPromise?: Promise<void>;

  public readonly broadcastChannelId?: bigint;
  public readonly submitterMemberId?: bigint;

  private constructor(
    query: string,
    sourceFilePath: string,
    sourceDetails: AudioSourceDetails,
    downloadProcess?: Deno.ChildProcess,
    broadcastChannelId?: bigint,
    submitterMemberId?: bigint
  ) {
    this.query = query;
    this.sourceDetails = sourceDetails;
    this.sourceFilePath = sourceFilePath;
    this.downloadProcess = downloadProcess;
    this.broadcastChannelId = broadcastChannelId;
    this.submitterMemberId = submitterMemberId;

    this.extractMetadata();
  }

  public async destroy() {
    if (this.sourceDetails.type === AudioSourceType.File) return;

    try {
      await Deno.remove(this.sourceFilePath);
    } catch (err: any) {
      console.error(
        "Failed to remove audio source file",
        this.sourceFilePath,
        err
      );
    }
  }

  public static from(
    query: string,
    broadcastChannelId?: bigint,
    submitterMemberId?: bigint
  ) {
    this.createTmpDir();

    return this.parseQuery(query, broadcastChannelId, submitterMemberId);
  }

  public static fromPath(path: string) {
    return new AudioSource("Automatic Track", path, {
      type: AudioSourceType.File,
    });
  }

  private static createTmpDir() {
    try {
      Deno.readDirSync(tmpAudioDirPath);
    } catch (_err) {
      AudioPlayer.log(null, "Creating tmp audio dir");
      Deno.mkdirSync(tmpAudioDirPath, {
        recursive: true,
      });
    }
  }

  private static parseQuery(
    query: string,
    broadcastChannelId?: bigint,
    submitterMemberId?: bigint
  ) {
    const ytId = AudioSource.getYtId(query);
    const spotId = AudioSource.getSpotId(query);
    const scId = AudioSource.getScId(query);

    if (ytId)
      return this.processId(
        AudioSourceType.YouTube,
        query,
        ytId,
        broadcastChannelId,
        submitterMemberId
      );
    else if (spotId)
      return this.processId(
        AudioSourceType.Spotify,
        query,
        spotId,
        broadcastChannelId,
        submitterMemberId
      );
    else if (scId)
      return this.processId(
        AudioSourceType.SoundCloud,
        query,
        scId,
        broadcastChannelId,
        submitterMemberId
      );
    else
      return this.processId(
        AudioSourceType.Unknown,
        query,
        null,
        broadcastChannelId,
        submitterMemberId
      );
  }

  private static getYtId(query: string) {
    const ytId = (new RegExp(ytIdRegex).exec(query) ?? [])[3] as
      | string
      | undefined;

    return ytId;
  }

  private static getSpotId(query: string) {
    const spotId = (new RegExp(spotIdRegex).exec(query) ?? [])[2] as
      | string
      | undefined;

    return spotId;
  }

  private static getScId(query: string) {
    const scId = (new RegExp(scIdRegex).exec(query) ?? [])[2] as
      | string
      | undefined;

    return scId;
  }

  private static readonly sourceFuncs = {
    [AudioSourceType.YouTube]: AudioSource.getYtSource,
    [AudioSourceType.Spotify]: AudioSource.getSpotSource,
    [AudioSourceType.SoundCloud]: AudioSource.getScSource,
    [AudioSourceType.File]: AudioSource.getYtSearchSource,
    [AudioSourceType.Unknown]: AudioSource.getYtSearchSource,
  };

  private static processId(
    type: AudioSourceType,
    query: string,
    id: string | null,
    broadcastChannelId?: bigint,
    submitterMemberId?: bigint
  ) {
    const sourceFunc = this.sourceFuncs[type];

    const res = sourceFunc(id ?? query);
    if (!res) return;

    const { sourceFilePath, sourceDetails, downloadProcess } = res;

    return new AudioSource(
      query,
      sourceFilePath,
      sourceDetails,
      downloadProcess,
      broadcastChannelId,
      submitterMemberId
    );
  }

  private static getYtSource(id: string) {
    const sourceFilePath = join(tmpAudioDirPath, `${crypto.randomUUID()}.webm`);

    const url = `https://www.youtube.com/watch?v=${id}`;

    try {
      const downloadProcess = new Deno.Command("yt-dlp", {
        args: [id, "-f", "bestaudio", "-o", sourceFilePath, "--embed-metadata"],
      }).spawn();

      return {
        sourceFilePath,
        sourceDetails: {
          type: AudioSourceType.YouTube,
          id,
          url,
        },
        downloadProcess,
      };
    } catch (err: any) {
      console.error("Unable to download using yt-dlp", err);
    }
  }

  private static getSpotSource(id: string) {
    const format = "mp3";

    const sourceFilePath = join(
      tmpAudioDirPath,
      `${crypto.randomUUID()}.{output-ext}`
    );

    const url = `https://open.spotify.com/track/${id}`;

    try {
      const downloadProcess = new Deno.Command("spotdl", {
        args: [url, "--format", format, "--output", `${sourceFilePath}`],
      }).spawn();

      return {
        sourceFilePath: sourceFilePath.replace("{output-ext}", format),
        sourceDetails: {
          type: AudioSourceType.Spotify,
          id,
          url,
        },
        downloadProcess,
      };
    } catch (err: any) {
      console.error("Unable to download using spotDl", err);
    }
  }

  private static getScSource(id: string) {
    const format = "mp3";

    const fileName = crypto.randomUUID();

    const sourceFilePath = join(tmpAudioDirPath, fileName);

    const url = `https://soundcloud.com/${id}`;

    try {
      const downloadProcess = new Deno.Command("scdl", {
        args: [
          "-l",
          url,
          "--onlymp3",
          "--path",
          tmpAudioDirPath,
          "--name-format",
          fileName,
        ],
      }).spawn();

      return {
        sourceFilePath: `${sourceFilePath}.${format}`,
        sourceDetails: {
          type: AudioSourceType.SoundCloud,
          id,
          url,
        },
        downloadProcess,
      };
    } catch (err: any) {
      console.error("Unable to download using scdl", err);
    }
  }

  private static getYtSearchSource(query: string) {
    const sourceFilePath = join(tmpAudioDirPath, `${crypto.randomUUID()}.webm`);

    try {
      const downloadProcess = new Deno.Command("yt-dlp", {
        args: [
          `ytsearch:${query}`,
          "-f",
          "bestaudio",
          "-o",
          sourceFilePath,
          "--embed-metadata",
        ],
      }).spawn();

      return {
        sourceFilePath,
        sourceDetails: {
          type: AudioSourceType.YouTube,
        },
        downloadProcess,
      };
    } catch (err: any) {
      console.error("Unable to download using yt-dlp", err);
    }
  }

  private async extractMetadata() {
    const fetchMetadata = async () => {
      await this.downloadProcess?.output();

      const { stdout } = await new Deno.Command("ffprobe", {
        args: [
          this.sourceFilePath,
          "-v",
          "quiet",
          "-print_format",
          "json",
          "-show_format",
        ],
      }).output();

      const metadataString = textDecoder.decode(stdout);

      try {
        const metadata = JSON.parse(metadataString) as
          | YoutubeMetadata
          | SpotifyMetadata
          | SoundCloudMetadata;
        this.parseMetadata(metadata);
      } catch (err: any) {
        console.error("Could not parse metadata", err);
      }
    };

    this.metadataExtractionPromise = fetchMetadata();
  }

  private parseMetadata(
    metadata: YoutubeMetadata | SpotifyMetadata | SoundCloudMetadata
  ) {
    if (isYouTubeMetaData(metadata, this.sourceDetails.type)) {
      this.sourceDetails.title = metadata.format?.tags?.title;
      this.sourceDetails.artist = metadata.format?.tags?.ARTIST;
      this.sourceDetails.album = metadata.format?.tags?.ALBUM;
      this.sourceDetails.duration = metadata.format?.duration
        ? parseFloat(metadata.format?.duration)
        : undefined;
      this.sourceDetails.date = metadata.format?.tags?.DATE;
      this.sourceDetails.url = metadata.format?.tags?.PURL;
      this.sourceDetails.id = AudioSource.getYtId(
        metadata.format?.tags?.PURL ?? ""
      );
    } else if (isSpotifyMetaData(metadata, this.sourceDetails.type)) {
      this.sourceDetails.title = metadata.format?.tags?.title;
      this.sourceDetails.artist = metadata.format?.tags?.artist;
      this.sourceDetails.album = metadata.format?.tags?.album;
      this.sourceDetails.duration = metadata.format?.duration
        ? parseFloat(metadata.format?.duration)
        : undefined;
      this.sourceDetails.date = metadata.format?.tags?.date;
    } else if (isSoundCloudMetadata(metadata, this.sourceDetails.type)) {
      this.sourceDetails.title = metadata.format?.tags?.title;
      this.sourceDetails.artist = metadata.format?.tags?.artist;
      this.sourceDetails.duration = metadata.format?.duration
        ? parseFloat(metadata.format?.duration)
        : undefined;
      this.sourceDetails.date = metadata.format?.tags?.date;
    }
  }
}

const isYouTubeMetaData = (
  _metadata: YoutubeMetadata | SpotifyMetadata | SoundCloudMetadata,
  audioSourceType: AudioSourceType
): _metadata is YoutubeMetadata => audioSourceType === AudioSourceType.YouTube;

const isSpotifyMetaData = (
  _metadata: YoutubeMetadata | SpotifyMetadata | SoundCloudMetadata,
  audioSourceType: AudioSourceType
): _metadata is SpotifyMetadata => audioSourceType === AudioSourceType.Spotify;

const isSoundCloudMetadata = (
  _metadata: YoutubeMetadata | SpotifyMetadata | SoundCloudMetadata,
  audioSourceType: AudioSourceType
): _metadata is SoundCloudMetadata =>
  audioSourceType === AudioSourceType.SoundCloud;
