import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import startup from "./startup.ts";

const router = new Router<State>();

startup.register(router);

export default router;
