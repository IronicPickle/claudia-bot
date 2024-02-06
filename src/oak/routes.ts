import { router } from "@oak/setupOak.ts";

import internalRouter from "./internal/router.ts";

router.use("/internal", internalRouter.routes());
