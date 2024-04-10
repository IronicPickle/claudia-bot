import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import audioStreamRouter from "./audioStream/router.ts";

const router = new Router<State>();

router.use("/audioStream", audioStreamRouter.routes());

export default router;
