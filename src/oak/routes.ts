import { router } from "@oak/setupOak.ts";

import internalRouter from "./internal/router.ts";
import guildsRouter from "./guilds/router.ts";

router.use("/internal", internalRouter.routes());
router.use("/guilds", guildsRouter.routes());
