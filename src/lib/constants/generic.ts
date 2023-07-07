import config from "../../config/config.ts";
import { path } from "../../deps/deps.ts";

export const srcDir = path.join(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "../../"
);
export const dataDir = path.join(srcDir, config.dataDir);
