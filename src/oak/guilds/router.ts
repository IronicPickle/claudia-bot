import { Router } from "oak";
import { State } from "@oak/setupOak.ts";

import guildIdRouter from "./[guildId]/router.ts";

const router = new Router<State>();

router.use("/:guildId", guildIdRouter.routes());

export default router;
