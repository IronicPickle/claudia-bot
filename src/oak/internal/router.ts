import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import eventsRouter from "./events/router.ts";
import guildsRouter from "./guilds/router.ts";

const router = new Router<State>();

router.use("/events", eventsRouter.routes());
router.use("/guilds", guildsRouter.routes());

export default router;
