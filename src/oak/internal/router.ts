import { Router } from "../../deps/oak.ts";
import { State } from "../setupOak.ts";
import eventsRouter from "./events/router.ts";

const internalRouter = new Router<State>();

internalRouter.use("/events", eventsRouter.routes());

export default internalRouter;
