import internalDiscordGuildsSync from "./internal/discord/guilds/sync.ts";

import internalDiscordGuildsCreate from "./internal/discord/guilds/{guildId}/create.ts";
import internalDiscordGuildsUpdate from "./internal/discord/guilds/{guildId}/update.ts";
import internalDiscordGuildsUpsert from "./internal/discord/guilds/{guildId}/upsert.ts";

import internalDiscordGuildsMembersCreate from "./internal/discord/guilds/{guildId}/members/{memberId}/create.ts";
import internalDiscordGuildsMembersUpdate from "./internal/discord/guilds/{guildId}/members/{memberId}/update.ts";
import internalDiscordGuildsMembersUpsert from "./internal/discord/guilds/{guildId}/members/{memberId}/upsert.ts";

export default abstract class Endpoints {
  static internal = {
    discord: {
      guilds: {
        sync: internalDiscordGuildsSync,

        create: internalDiscordGuildsCreate,
        update: internalDiscordGuildsUpdate,
        upsert: internalDiscordGuildsUpsert,

        members: {
          create: internalDiscordGuildsMembersCreate,
          update: internalDiscordGuildsMembersUpdate,
          upsert: internalDiscordGuildsMembersUpsert,
        },
      },
    },
  };
}
