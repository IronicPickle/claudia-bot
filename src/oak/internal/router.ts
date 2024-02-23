import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import eventsRouter from "./events/router.ts";

const router = new Router<State>();

router.use("/events", eventsRouter.routes());

export default router;
