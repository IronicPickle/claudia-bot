import { error, ok } from "@shared/lib/utils/api.ts";
import { log, logError } from "@utils/generic.ts";
import { attemptGuildSync } from "../../../startupSetup.ts";
import { createRoute } from "@oak/setupOak.ts";

export default createRoute((router) => {
  router.post("/startup", async (ctx) => {
    try {
      log("[Events - Startup]", "Performing guilds sync...");
      await attemptGuildSync();

      return ok({})(ctx);
    } catch (err: any) {
      logError(err);
      return error("Something went wrong.")(ctx);
    }
  });
});
