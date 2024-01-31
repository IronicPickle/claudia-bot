import Endpoint from "../../../../lib/objects/Endpoint.ts";
import {
  RequestSpec,
  validator,
} from "../../../../../../claudia-shared/lib/api/server/internal/discord/guilds/sync.ts";
import { api } from "../../../api.ts";

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
