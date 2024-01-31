import Endpoint from "../../../../../../../lib/objects/Endpoint.ts";
import {
  RequestSpec,
  validator,
} from "../../../../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/%7BguildId%7D/members/%7BmemberId%7D/upsert.ts";
import { api } from "../../../../../../api.ts";

export default new Endpoint<RequestSpec>(
  async ({ params: { guildId, memberId }, body }) =>
    await api
      .put(`internal/discord/guilds/${guildId}/members/${memberId}`, {
        headers: {
          "content-type": "application/json",
        },
        json: body,
      })
      .json<RequestSpec["res"]>(),
  validator
);
