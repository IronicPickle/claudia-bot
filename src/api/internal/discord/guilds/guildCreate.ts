import { RequestInputs } from "../../../../../../claudia-shared/lib/ts/api/generic.ts";
import { GuildCreate } from "../../../../../../claudia-shared/lib/ts/api/server/internal/discord/guilds.ts";
import { apiCall, api } from "../../../api.ts";

export default async ({ body }: RequestInputs<GuildCreate>) =>
  await apiCall(
    async () =>
      await api
        .post("internal/discord/guilds", {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildCreate["res"]>()
  );
