import Endpoints from "./api/Endpoints.ts";
import { log, logError } from "./lib/utils/generic.ts";
import { bot } from "./bot/setupBot.ts";
import { sleep } from "../../claudia-shared/lib/utils/generic.ts";
import DbTransformer from "./lib/objects/DbTransformer.ts";
import { DbDiscordGuild } from "../../claudia-shared/lib/api/server/internal/discord/dbSpec.ts";

export default () => {
  setTimeout(attemptGuildSync, 1000 * 1);
};

export const attemptGuildSync = async () => {
  const maxAttempts = 50;

  const guildCount = bot.cache.guildCount;

  log(
    "[Initial]",
    "[Guild Sync]",
    "Processing of",
    guildCount,
    "guilds required before performing sync."
  );

  for (let attempt = 0; true; attempt++) {
    log(
      "[Initial]",
      "[Guild Sync]",
      Object.values(bot.cache.guilds).length,
      "/",
      guildCount,
      "guilds processed."
    );

    if (Object.values(bot.cache.guilds).length >= guildCount) break;

    if (attempt > maxAttempts)
      return log(
        "[Initial]",
        "[Guild Sync]",
        "Guild sync exceeded max attempts",
        maxAttempts
      );

    await sleep(1000);
  }

  await runGuildsSync();
};

const runGuildsSync = async () => {
  log(
    "[Initial]",
    "[Guild Sync]",
    "Performing guild sync for",
    Object.values(bot.cache.guilds).length,
    "guilds."
  );

  const botConfig = bot.configManager.readConfig();

  if (!botConfig)
    throw new Error("[Initial] [Guild Sync] - Expected guild config.");

  for (const i in botConfig.guilds) {
    botConfig.guilds[i].active = false;
  }

  const guilds: DbDiscordGuild[] = [];

  for (const guildId in bot.cache.guilds) {
    const guild = bot.cache.guilds[guildId];

    const { name, members } = guild;

    guilds.push(DbTransformer.guild(guild, Object.values(members), true));

    if (!botConfig.guilds[guildId]) {
      log(
        "[Initial]",
        "[Guild Sync]",
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

  const { error } = await Endpoints.internal.discord.guilds.sync.call({
    body: {
      guilds,
    },
  });

  if (error) logError(error);
};
