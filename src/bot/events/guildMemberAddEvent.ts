import Endpoints from "@api/Endpoints.ts";
import { Member } from "discordeno";
import DbTransformer from "@objects/DbTransformer.ts";
import { log } from "@utils/generic.ts";
import { bot } from "@bot/setupBot.ts";

export default () => {
  bot.eventManager.addEventListener("guildMemberAdd", async (_bot, member) => {
    updateCache(member);

    await updateMember(member);
  });
};

const updateCache = (member: Member) => {
  const memberId = member.id.toString();
  const guildId = member.guildId.toString();

  bot.cache.guilds[guildId].members[memberId] = member;
};

const updateMember = async (member: Member) => {
  log(`Member joined guild: '${member.id}', updating...`);

  await upsert(member);
};

const upsert = async (member: Member) => {
  const { guildId, memberId, ...body } = DbTransformer.member(member, true);

  const { error: upsertError } =
    await Endpoints.internal.discord.guilds.members.upsert.call({
      params: {
        guildId,
        memberId,
      },
      body,
    });

  if (upsertError) log(upsertError);
};
