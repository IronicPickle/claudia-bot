import { Bot, Guild } from "../../deps/discordeno.ts";

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & {
    cache: Bot["cache"] & {
      guilds: Record<string, Guild>;
    };
  };

  wrappedBot.cache.guilds = {};

  return wrappedBot;
};
