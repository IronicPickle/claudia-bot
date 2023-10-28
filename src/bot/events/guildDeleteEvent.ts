import guildUpdate from "../../api/internal/discord/guilds/guildUpdate.ts";
import { log } from "../../lib/utils/generic.ts";
import { GuildConfig } from "../managers/BotConfigManager.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildDelete", (_bot, id) => {
    const guildId = id.toString();

    if (bot.cache.guilds[guildId]) delete bot.cache.guilds[guildId];

    const guildConfig = bot.configManager.getGuildConfig(id);

    if (!guildConfig) return;

    guildConfig.active = false;

    bot.configManager.updateGuildConfig(id, guildConfig);

    updateGuild(id, guildConfig);
  });
};

const updateGuild = async (id: bigint, guildConfig: GuildConfig) => {
  log(`Bot left guild: '${id}', updating...`);

  guildConfig.active = false;

  bot.configManager.updateGuildConfig(id, guildConfig);

  await update(id);
};

const update = async (id: bigint) => {
  const { error: upsertError } = await guildUpdate({
    params: {
      guildId: id.toString(),
    },
    body: {
      active: false,
    },
  });

  if (upsertError) log(upsertError.error);
};
