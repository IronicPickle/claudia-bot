import { log } from "../lib/utils/generic.ts";
import { bot } from "./setupBot.ts";

export default () => {
  setTimeout(runGuildsSync, 1000 * 1);
};

export const runGuildsSync = () => {
  log(
    "[Initial Setup]",
    "Running guild sync for",
    bot.cache.guilds.size,
    "guilds"
  );
};
