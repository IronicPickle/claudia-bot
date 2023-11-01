import { Bot, Guild, Member } from "../../deps/discordeno.ts";

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
