import { error, ok } from "../../../../../claudia-shared/lib/utils/api.ts";
import { router } from "../../setupOak.ts";
import { log, logError } from "../../../../src/lib/utils/generic.ts";
import { runGuildsSync } from "../../../bot/startupSetup.ts";

export default () => {
  router.post("/internal/events/startup", async (ctx) => {
    try {
      log("[Events - Startup]", "Performing guilds sync...");
      await runGuildsSync();

      return ok({})(ctx);
    } catch (err: any) {
      logError(err);
      return error("Something went wrong.")(ctx);
    }
  });
};
