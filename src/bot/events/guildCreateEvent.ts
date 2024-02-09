import Endpoints from "@api/Endpoints.ts";
import { Guild, Member } from "discordeno";
import DbTransformer from "@objects/DbTransformer.ts";
import { getAllMembers } from "@utils/bot.ts";
import { log } from "@utils/generic.ts";
import { GuildConfig } from "@bot/managers/BotConfigManager.ts";
import { bot } from "@bot/setupBot.ts";
import { isResError } from "@shared/lib/utils/api.ts";

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

  const res = await Endpoints.internal.discord.guilds.upsert.call({
    params: {
      guildId,
    },
    body,
  });

  if (isResError(res)) log(res.error);
};

//https://discord.com/oauth2/authorize?client_id=1124008138811646134&permissions=8&scope=bot
