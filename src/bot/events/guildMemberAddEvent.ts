import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildMemberAdd", (_bot, member) => {});
};
