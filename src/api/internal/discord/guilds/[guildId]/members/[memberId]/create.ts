import Endpoint from "@objects/Endpoint.ts";
import {
  RequestSpec,
  validator,
} from "@shared/lib/api/server/internal/discord/guilds/[guildId]/members/[memberId]/create.ts";
import { api } from "@api/api.ts";

export default new Endpoint<RequestSpec>(
  async ({ params: { guildId, memberId }, body }) =>
    await api
      .post(`internal/discord/guilds/${guildId}/members/${memberId}`, {
        headers: {
          "content-type": "application/json",
        },
        json: body,
      })
      .json<RequestSpec["res"]>(),
  validator
);
