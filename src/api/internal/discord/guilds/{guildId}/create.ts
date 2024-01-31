import Endpoint from "../../../../../lib/objects/Endpoint.ts";
import {
  RequestSpec,
  validator,
} from "../../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/{guildId}/create.ts";
import { api } from "../../../../api.ts";

export default new Endpoint<RequestSpec>(
  async ({ params: { guildId }, body }) =>
    await api
      .post(`internal/discord/guilds/${guildId}`, {
        headers: {
          "content-type": "application/json",
        },
        json: body,
      })
      .json<RequestSpec["res"]>(),
  validator
);
