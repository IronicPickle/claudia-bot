import guildUpsert from "../../api/internal/discord/guilds/guildUpsert.ts";
import { Guild, Member } from "../../deps/discordeno.ts";
import DbTransformer from "../../lib/objects/DbTransformer.ts";
import { getAllMembers } from "../../lib/utils/bot.ts";
import { log } from "../../lib/utils/generic.ts";
import { GuildConfig } from "../managers/BotConfigManager.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildCreate", async (_bot, guild) => {
    const guildConfig = bot.configManager.getGuildConfig(guild.id);

    const members = await updateCache(guild);

    if (!guildConfig) await initGuild(guild, Object.values(members));
    else if (!guildConfig.active)
      await updateGuild(guild, Object.values(members), guildConfig);
  });
};

const updateCache = async (guild: Guild) => {
  const guildId = guild.id.toString();

  bot.cache.guildCount++;

  const members = await getAllMembers(bot, guild.id);

  bot.cache.guilds[guildId] = { ...guild, members };

  return members;
};

const initGuild = async (guild: Guild, members: Member[]) => {
  log(
    `Bot joined guild for first time: '${guild.id}' (${guild.name}), initialising...`
  );

  // Init config
  bot.configManager.initGuildConfig(guild.id);

  await upsert(guild, members);
};

const updateGuild = async (
  guild: Guild,
  members: Member[],
  guildConfig: GuildConfig
) => {
  log(`Bot rejoined guild: '${guild.id}' (${guild.name}), updating...`);

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
