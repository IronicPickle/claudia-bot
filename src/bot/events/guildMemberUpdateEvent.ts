import Endpoints from "../../api/Endpoints.ts";
import { Member } from "../../deps/discordeno.ts";
import DbTransformer from "../../lib/objects/DbTransformer.ts";
import { log } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener(
    "guildMemberUpdate",
    async (_bot, member) => {
      updateCache(member);

      await updateMember(member);
    }
  );
};

const updateCache = (member: Member) => {
  const memberId = member.id.toString();
  const guildId = member.guildId.toString();

  bot.cache.guilds[guildId].members[memberId] = member;
};

const updateMember = async (member: Member) => {
  log(`Member updated: '${member.id}', updating...`);

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
