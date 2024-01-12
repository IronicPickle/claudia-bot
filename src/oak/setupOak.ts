import { httpMethodColors } from "../../../claudia-shared/lib/constants/generic.ts";
import { ConsoleColor } from "../../../claudia-shared/lib/enums/generic.ts";
import config from "../config/config.ts";
import { Application, Router } from "../deps/oak.ts";
import { decodeJwt } from "../lib/utils/api.ts";
import { log } from "../lib/utils/generic.ts";

import internalEventStartup from "./internal/events/startup.ts";

interface State {
  userId?: "internal" | string;
}

export const app = new Application<State>();
export const router = new Router<State>();

export default () => {
  app.use(async ({ request }, next) => {
    log(
      ConsoleColor.Green,
      "[Oak]",
      ConsoleColor.Bright,
      httpMethodColors[request.method],
      request.method,
      ConsoleColor.Reset,
      "-",
      ConsoleColor.Cyan,
      request.url.pathname,
      ConsoleColor.Reset
    );

    await next();
  });

  app.use(async ({ state, request }, next) => {
    const jwt = request.headers.get("Authorization")?.replace("BEARER ", "");
    if (jwt) {
      const payload = await decodeJwt(jwt);

      if (payload) state.userId = payload.sub;
    }
    await next();
  });

  internalEventStartup();

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.addEventListener("listen", ({ port }) => {
    log("[Oak]", `Listening on ${port}`);
  });

  app.listen(config.oak.listenOptions);
};
