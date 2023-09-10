import { RequestInputs } from "../../../../../claudia-shared/lib/ts/api/generic.ts";
import { GuildUpdate } from "../../../../../claudia-shared/lib/ts/api/server/internal/guilds/guilds.ts";
import { apiCall, api } from "./../../api.ts";

export default async ({
  params: { guildId },
  body,
}: RequestInputs<GuildUpdate>) =>
  await apiCall(
    async () =>
      await api
        .patch(`internal/discord/guilds/${guildId}`, {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildUpdate["res"]>()
  );
