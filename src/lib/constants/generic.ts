import config from "../../config/config.ts";
import { path } from "../../deps/deps.ts";
import { AudioSourceType } from "../enums/audio.ts";

export const srcDir = path.join(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "../../"
);
export const dataDir = path.join(srcDir, config.dataDir);
export const tmpDirPath = path.join(dataDir, "tmp");

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
  [AudioSourceType.Unknown]: "Unknown",
};

export const audioSourceTypeColors = {
  [AudioSourceType.YouTube]: "0xFF0000",
  [AudioSourceType.Spotify]: "0x1ED760",
  [AudioSourceType.SoundCloud]: "0xFF7700",
  [AudioSourceType.Unknown]: "0xFFFFFF",
};
