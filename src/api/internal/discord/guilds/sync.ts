import Endpoint from "@objects/Endpoint.ts";
import {
  RequestSpec,
  validator,
} from "@shared/lib/api/server/internal/discord/guilds/sync.ts";
import { api } from "@api/api.ts";

export default new Endpoint<RequestSpec>(
  async ({ body }) =>
    await api
      .put("internal/discord/guilds/sync", {
        headers: {
          "content-type": "application/json",
        },
        json: body,
      })
      .json<RequestSpec["res"]>(),
  validator
);
