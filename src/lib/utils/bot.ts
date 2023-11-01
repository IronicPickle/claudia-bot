import { Bot, Member } from "../../deps/discordeno.ts";

export const getAllMembers = async (bot: Bot, guildId: bigint) => {
  const members: Member[] = [];

  const guild = await bot.helpers.getGuild(guildId);

  const maxMembersPerFetch = 1000;

  for (
    let i = 0;
    i < (guild.approximateMemberCount ?? 0);
    i += maxMembersPerFetch
  ) {
    const membersChunk = await bot.helpers.getMembers(guildId, {
      limit: maxMembersPerFetch,
      after: members[members.length - 1]?.id.toString(),
    });

    members.push(...membersChunk.array());
  }

  return members.reduce((acc, member) => {
    acc[member.id.toString()] = member;
    return acc;
  }, {} as Record<string, Member>);
};
