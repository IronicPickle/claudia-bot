import { Router } from "../../../deps/oak.ts";
import { State } from "../../setupOak.ts";

import startup from "./startup.ts";

const eventsRouter = new Router<State>();

startup(eventsRouter);

export default eventsRouter;
