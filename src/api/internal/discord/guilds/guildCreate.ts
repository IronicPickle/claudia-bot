import { RequestInputs } from "../../../../../../claudia-shared/lib/ts/api/generic.ts";
import { GuildCreate } from "../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/guildsSpec.ts";
import { apiCall, api } from "../../../api.ts";

export default async ({
  params: { guildId },
  body,
}: RequestInputs<GuildCreate>) =>
  await apiCall(
    async () =>
      await api
        .post(`internal/discord/guilds/${guildId}`, {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildCreate["res"]>()
  );
