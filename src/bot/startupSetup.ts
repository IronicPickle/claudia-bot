import { GuildsSync } from "../../../claudia-shared/lib/ts/api/server/internal/discord/guilds.ts";
import guildsSync from "../api/internal/discord/guilds/guildsSync.ts";
import { log, logError } from "../lib/utils/generic.ts";
import { bot } from "./setupBot.ts";

export default () => {
  setTimeout(runGuildsSync, 1000 * 1);
};

export const runGuildsSync = async () => {
  log(
    "[Initial Setup]",
    "Running guild sync for",
    Object.values(bot.cache.guilds).length,
    "guilds"
  );

  const botConfig = bot.configManager.readConfig();

  if (!botConfig) throw new Error("[Initial Setup] - Expected guild config");

  for (const i in botConfig.guilds) {
    botConfig.guilds[i].active = false;
  }

  const guilds: GuildsSync["body"]["guilds"] = [];

  for (const guildId in bot.cache.guilds) {
    const { name, description, joinedAt } = bot.cache.guilds[guildId];

    guilds.push({
      guildId,
      active: true,
      name,
      description,
      joinedAt,
    });

    if (!botConfig.guilds[guildId]) {
      log(
        "[Initial Setup]",
        "Expected guild config for guild: ",
        guildId,
        name
      );
      continue;
    }
    botConfig.guilds[guildId].active = true;
  }

  bot.configManager.setConfig(botConfig);
  bot.configManager.writeConfig();

  const { error } = await guildsSync({
    body: {
      guilds,
    },
  });

  if (error) logError(error.error);
};
