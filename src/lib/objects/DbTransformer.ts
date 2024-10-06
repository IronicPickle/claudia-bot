import {
  DbDiscordGuild,
  DbDiscordMember,
  DbDiscordPremiumTypes,
  DbDiscordUser,
} from "@shared/lib/api/server/internal/discord/dbSpec.ts";
import { Guild, Member } from "discordeno";
import { bot } from "@bot/setupBot.ts";
import { CacheGuild } from "@bot/wrappers/cacheWrapper.ts";

export default class DbTransformer {
  static guild(
    guild: Guild | CacheGuild,
    members: Member[],
    active: boolean
  ): DbDiscordGuild {
    const { id, name, description, joinedAt } = guild;

    return {
      guildId: id.toString(),
      active,
      name,
      description,
      joinedAt,
      members: members.map((member) => DbTransformer.member(member, true)),
    };
  }

  static member(member: Member, active: boolean): DbDiscordMember {
    const {
      id,
      guildId,
      avatar,
      joinedAt,
      nick,
      permissions,
      roles,
      user,
      communicationDisabledUntil,
      premiumSince,
    } = member;

    const processedUser: DbDiscordUser | undefined = user
      ? {
          userId: user.id.toString(),
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar
            ? bot.utils.iconBigintToHash(user.avatar)
            : undefined,
          locale: user.locale,
          premiumType: user.premiumType as DbDiscordPremiumTypes | undefined,
        }
      : undefined;

    return {
      memberId: id.toString(),
      guildId: guildId.toString(),
      avatar: avatar ? bot.utils.iconBigintToHash(avatar) : undefined,
      active,
      joinedAt,
      nick,
      permissions: permissions?.toString(),
      roles: roles.map((role) => role.toString()),
      user: processedUser,
      communicationDisabledUntil,
      premiumSince,
    };
  }
}
