import internalRouter from "./internal/router.ts";
import { router } from "./setupOak.ts";

router.use("/internal", internalRouter.routes());
