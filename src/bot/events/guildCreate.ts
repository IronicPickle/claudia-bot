import { log } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildCreate", (_bot, guild) => {
    const guildConfig = bot.configManager.getGuildConfig(guild.id);
    if (guildConfig) return;

    log(
      `Bot joined guild: '${guild.id}' (${guild.name}), generating config...`
    );
    bot.configManager.initGuildConfig(guild.id);
  });
};
