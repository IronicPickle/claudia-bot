import config from "../config/config.ts";
import { Application, Router } from "../deps/oak.ts";
import { log } from "../lib/utils/generic.ts";

import internalEventStartup from "./internal/events/startup.ts";

export const app = new Application();
export const router = new Router();

export default () => {
  internalEventStartup();

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.addEventListener("listen", ({ port }) => {
    log("[Oak]", `Listening on ${port}`);
  });

  app.listen(config.oak.listenOptions);
};
