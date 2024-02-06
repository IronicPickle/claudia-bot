import config from "@config/config.ts";
import { join, dirname, fromFileUrl } from "path";
import { AudioSourceType } from "@enums/audio.ts";

export const srcDir = join(dirname(fromFileUrl(import.meta.url)), "../../");
export const dataDir = join(srcDir, config.dataDir);
export const benDir = join(srcDir, "ben");
export const tmpDirPath = join(dataDir, "tmp");

// Id lands in index [3]
export const ytIdRegex =
  /(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/g;

// Id lands in index [2]
export const spotIdRegex = /(open\.spotify\.com\/track\/)([a-zA-Z0-9]*)/g;

// Id lands in index [2]
export const scIdRegex = /(soundcloud.com)\/([a-zA-Z0-9]*\/[a-zA-Z0-9-_]*)/g;

export const audioSourceTypeNames = {
  [AudioSourceType.YouTube]: "YouTube",
  [AudioSourceType.Spotify]: "Spotify",
  [AudioSourceType.SoundCloud]: "SoundCloud",
  [AudioSourceType.File]: "File",
  [AudioSourceType.Unknown]: "Unknown",
};

export const audioSourceTypeColors = {
  [AudioSourceType.YouTube]: "0xFF0000",
  [AudioSourceType.Spotify]: "0x1ED760",
  [AudioSourceType.SoundCloud]: "0xFF7700",
  [AudioSourceType.File]: "0xFFFFFF",
  [AudioSourceType.Unknown]: "0xFFFFFF",
};
