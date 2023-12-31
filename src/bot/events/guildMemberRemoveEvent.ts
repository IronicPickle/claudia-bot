import guildMemberUpdate from "../../api/internal/discord/guilds/members/guildMemberUpdate.ts";
import { Member } from "../../deps/discordeno.ts";
import { log } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.addEventListener(
    "guildMemberRemove",
    async (_bot, user, guildIdBigInt) => {
      const { id: userIdBigInt } = user;

      const guildId = guildIdBigInt.toString();

      const member = Object.values(bot.cache.guilds[guildId].members).find(
        ({ user }) => user?.id === userIdBigInt
      );

      if (!member) return;

      updateCache(member);

      await updateMember(member);
    }
  );
};

const updateCache = (member: Member) => {
  const guildId = member.guildId.toString();
  const memberId = member.id.toString();

  delete bot.cache.guilds[guildId].members[memberId];
};

const updateMember = async (member: Member) => {
  log(`Member left guild: '${member.id}', updating...`);

  await update(member);
};

const update = async (member: Member) => {
  const { error: upsertError } = await guildMemberUpdate({
    params: {
      guildId: member.guildId.toString(),
      memberId: member.id.toString(),
    },
    body: {
      active: false,
    },
  });

  if (upsertError) log(upsertError);
};
