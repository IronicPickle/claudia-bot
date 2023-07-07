import { log } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildDelete", (_bot, id) => {
    log(`Bot left guild ${id}.`);
  });
};
