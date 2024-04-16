import config from "@config/config.ts";
import { join, dirname, fromFileUrl } from "path";

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
