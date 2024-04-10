import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import eventsRouter from "./events/router.ts";
import audioStreamRouter from "./audioStream/router.ts";

const router = new Router<State>();

router.use("/events", eventsRouter.routes());
router.use("/audioStream", audioStreamRouter.routes());

export default router;
