import { RequestInputs } from "../../../../../../claudia-shared/lib/ts/api/generic.ts";
import { GuildsSync } from "../../../../../../claudia-shared/lib/ts/api/server/internal/discord/guilds.ts";
import { apiCall, api } from "../../../api.ts";

export default async ({ body }: RequestInputs<GuildsSync>) =>
  await apiCall(
    async () =>
      await api
        .post("internal/discord/guilds/sync", {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildsSync["res"]>()
  );
