import Endpoint from "@objects/Endpoint.ts";
import {
  RequestSpec,
  validator,
} from "@shared/lib/api/server/internal/discord/guilds/[guildId]/update.ts";
import { api } from "@api/api.ts";

export default new Endpoint<RequestSpec>(
  async ({ params: { guildId }, body }) =>
    await api
      .patch(`internal/discord/guilds/${guildId}`, {
        headers: {
          "content-type": "application/json",
        },
        json: body,
      })
      .json<RequestSpec["res"]>(),
  validator
);
