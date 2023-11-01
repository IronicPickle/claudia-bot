import { httpMethodColors } from "../../../claudia-shared/lib/constants/generic.ts";
import { ConsoleColor } from "../../../claudia-shared/lib/enums/generic.ts";
import config from "../config/config.ts";
import { Application, Router } from "../deps/oak.ts";
import { log } from "../lib/utils/generic.ts";

import internalEventStartup from "./internal/events/startup.ts";

export const app = new Application();
export const router = new Router();

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

  internalEventStartup();

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.addEventListener("listen", ({ port }) => {
    log("[Oak]", `Listening on ${port}`);
  });

  app.listen(config.oak.listenOptions);
};
