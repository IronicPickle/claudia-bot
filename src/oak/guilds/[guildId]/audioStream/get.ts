import { error, ok } from "@shared/lib/utils/api.ts";
import { log, logError } from "@utils/generic.ts";
import { createRoute } from "@oak/setupOak.ts";
import { GenericErrorCode } from "@shared/lib/enums/api.ts";

export default createRoute((router) => {
  router.get("/", async (ctx) => {
    try {
      console.log("audio stream");

      if (!ctx.isUpgradable)
        return error("Cannot upgrade.", GenericErrorCode.NotImplemented, 501);

      const socket = ctx.upgrade();

      console.log(socket);

      socket.addEventListener("open", (event) => console.log("open"));
      socket.addEventListener("close", (event) =>
        console.log("close", event.reason)
      );
      socket.addEventListener("message", (event) =>
        console.log("message", event.data)
      );
      socket.addEventListener("error", (event) => console.log("error"));

      return ok({})(ctx);
    } catch (err: any) {
      logError(err);
      return error("Something went wrong.")(ctx);
    }
  });
});
