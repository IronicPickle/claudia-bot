import { Bot, Guild, Member } from "discordeno";

export interface CacheGuild extends Guild {
  members: Record<string, Member>;
}

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & {
    cache: Bot["cache"] & {
      guilds: Record<string, CacheGuild>;
      guildCount: number;
    };
  };

  wrappedBot.cache.guildCount = 0;

  wrappedBot.cache.guilds = {};

  return wrappedBot;
};
