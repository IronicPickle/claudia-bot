import guildUpsert from "../../api/internal/discord/guilds/guildUpsert.ts";
import { Guild } from "../../deps/discordeno.ts";
import { log } from "../../lib/utils/generic.ts";
import { GuildConfig } from "../managers/BotConfigManager.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildUpdate", async (_bot, guild) => {
    const { id } = guild;

    const guildId = id.toString();

    if (bot.cache.guilds[guildId]) delete bot.cache.guilds[guildId];
    bot.cache.guilds[guildId] = guild;

    const guildConfig = bot.configManager.getGuildConfig(id);

    if (!guildConfig) await initGuild(guild);
    else await updateGuild(guild, guildConfig);
  });
};

const initGuild = async (guild: Guild) => {
  const { id, name } = guild;

  log(`Guild not registered: '${id}' (${name}), initialising...`);

  bot.configManager.initGuildConfig(id);

  await upsert(guild);
};

const updateGuild = async (guild: Guild, guildConfig: GuildConfig) => {
  const { id, name } = guild;

  log(`Guild updated: '${id}' (${name}), updating...`);

  guildConfig.active = true;

  bot.configManager.updateGuildConfig(id, guildConfig);

  await upsert(guild);
};

const upsert = async (guild: Guild) => {
  const { id, name, description, joinedAt } = guild;

  const { error: upsertError } = await guildUpsert({
    params: {
      guildId: id.toString(),
    },
    body: {
      active: true,
      name,
      description,
      joinedAt,
    },
  });

  if (upsertError) log(upsertError.error);
};

//https://discord.com/oauth2/authorize?client_id=1124008138811646134&permissions=8&scope=bot
