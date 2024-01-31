import Endpoints from "../../api/Endpoints.ts";
import { Guild } from "../../deps/discordeno.ts";
import { log } from "../../lib/utils/generic.ts";
import { GuildConfig } from "../managers/BotConfigManager.ts";
import { bot } from "../setupBot.ts";

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

const updateGuild = async (guild: Guild, guildConfig: GuildConfig) => {
  log(`Bot left guild: '${guild.id}', updating...`);

  // Update config
  guildConfig.active = false;
  bot.configManager.updateGuildConfig(guild.id, guildConfig);

  await update(guild);
};

const update = async (guild: Guild) => {
  const { error: upsertError } =
    await Endpoints.internal.discord.guilds.update.call({
      params: {
        guildId: guild.id.toString(),
      },
      body: {
        active: false,
      },
    });

  if (upsertError) log(upsertError);
};
