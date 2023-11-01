import { RequestInputs } from "../../../../../../claudia-shared/lib/ts/api/generic.ts";
import { GuildUpdate } from "../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/guildsSpec.ts";
import { apiCall, api } from "../../../api.ts";

export default async ({
  params: { guildId },
  body,
}: RequestInputs<GuildUpdate>) =>
  await apiCall(
    async () =>
      await api
        .put(`internal/discord/guilds/${guildId}`, {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildUpdate["res"]>()
  );
