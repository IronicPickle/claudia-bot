import Endpoints from "@api/Endpoints.ts";
import { Guild } from "discordeno";
import { log } from "@utils/generic.ts";
import { GuildConfig } from "@bot/managers/BotConfigManager.ts";
import { bot } from "@bot/setupBot.ts";
import { isResError } from "@shared/lib/utils/api.ts";
import { CacheGuild } from "@bot/wrappers/cacheWrapper.ts";

export default () => {
  bot.eventManager.addEventListener("guildDelete", async (_bot, id) => {
    const guildId = id.toString();

    const guild = bot.cache.guilds[guildId];

    updateCache(guildId);

    const guildConfig = bot.configManager.getGuildConfig(id);

    if (!guildConfig || !guild) return;

    await updateGuild(guild, guildConfig);
  });
};

const updateCache = (guildId: string) => {
  bot.cache.guildCount--;

  delete bot.cache.guilds[guildId];
};

const updateGuild = async (guild: CacheGuild, guildConfig: GuildConfig) => {
  log(`Bot left guild: '${guild.id}', updating...`);

  // Update config
  guildConfig.active = false;
  bot.configManager.updateGuildConfig(guild.id, guildConfig);

  await update(guild);
};

const update = async (guild: CacheGuild) => {
  const res = await Endpoints.internal.discord.guilds.update.call({
    params: {
      guildId: guild.id.toString(),
    },
    body: {
      active: false,
    },
  });

  if (isResError(res)) log(res.error);
};
