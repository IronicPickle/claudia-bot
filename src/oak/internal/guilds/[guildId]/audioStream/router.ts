import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import get from "./get.ts";

const router = new Router<State>();

get.register(router);

export default router;
