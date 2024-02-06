import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import startup from "./startup.ts";

const eventsRouter = new Router<State>();

startup.register(eventsRouter);

export default eventsRouter;
