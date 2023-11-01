import { RequestInputs } from "../../../../../../../claudia-shared/lib/ts/api/generic.ts";
import { apiCall, api } from "../../../../api.ts";
import { GuildMemberUpdate } from "../../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/members/membersSpec.ts";

export default async ({
  params: { guildId, memberId },
  body,
}: RequestInputs<GuildMemberUpdate>) =>
  await apiCall(
    async () =>
      await api
        .patch(`internal/discord/guilds/${guildId}/members/${memberId}`, {
          headers: {
            "content-type": "application/json",
          },
          json: body,
        })
        .json<GuildMemberUpdate["res"]>()
  );
