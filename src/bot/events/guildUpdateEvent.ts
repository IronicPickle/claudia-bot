import guildUpsert from "../../api/internal/discord/guilds/guildUpsert.ts";
import { Guild, Member } from "../../deps/discordeno.ts";
import DbTransformer from "../../lib/objects/DbTransformer.ts";
import { getAllMembers } from "../../lib/utils/bot.ts";
import { log } from "../../lib/utils/generic.ts";
import { GuildConfig } from "../managers/BotConfigManager.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildUpdate", async (_bot, guild) => {
    const members = await updateCache(guild);

    const guildConfig = bot.configManager.getGuildConfig(guild.id);

    if (!guildConfig) return;

    await updateGuild(guild, Object.values(members), guildConfig);
  });
};

const updateCache = async (guild: Guild) => {
  const guildId = guild.id.toString();

  const members = await getAllMembers(bot, guild.id);

  bot.cache.guilds[guildId] = { ...guild, members };

  return members;
};

const updateGuild = async (
  guild: Guild,
  members: Member[],
  guildConfig: GuildConfig
) => {
  log(`Guild updated: '${guild.id}' (${guild.name}), updating...`);

  // Update config
  guildConfig.active = true;
  bot.configManager.updateGuildConfig(guild.id, guildConfig);

  await upsert(guild, members);
};

const upsert = async (guild: Guild, members: Member[]) => {
  const { guildId, ...body } = DbTransformer.guild(guild, members, true);

  const { error: upsertError } = await guildUpsert({
    params: {
      guildId,
    },
    body,
  });

  if (upsertError) log(upsertError);
};

//https://discord.com/oauth2/authorize?client_id=1124008138811646134&permissions=8&scope=bot
