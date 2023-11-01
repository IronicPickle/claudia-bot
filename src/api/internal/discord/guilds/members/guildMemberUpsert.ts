import { RequestInputs } from "../../../../../../../claudia-shared/lib/ts/api/generic.ts";
import { apiCall, api } from "../../../../api.ts";
import { GuildMemberUpsert } from "../../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/members/membersSpec.ts";

export default async ({
  params: { guildId, memberId },
  body,
}: RequestInputs<GuildMemberUpsert>) =>
  await apiCall(
    async () =>
      await api
        .put(`internal/discord/guilds/${guildId}/members/${memberId}`, {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildMemberUpsert["res"]>()
  );
