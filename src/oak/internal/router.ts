import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import eventsRouter from "./events/router.ts";

const internalRouter = new Router<State>();

internalRouter.use("/events", eventsRouter.routes());

export default internalRouter;
