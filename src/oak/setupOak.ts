import { httpMethodColors } from "@shared/lib/constants/generic.ts";
import { ConsoleColor } from "@shared/lib/enums/generic.ts";
import { bot } from "@bot/setupBot.ts";
import config from "@config/config.ts";
import { Application, Router } from "oak";
import { AudioStreamEvent } from "@objects/AudioStream.ts";
import { decodeJwt } from "@utils/api.ts";
import { log } from "@utils/generic.ts";
import { forbiddenError } from "@shared/lib/utils/api.ts";

export interface State {
  userId?: "internal" | string;
}

export const createRoute = (callback: (router: Router<State>) => void) => ({
  register: callback,
});

export const app = new Application<State>();
export const router = new Router<State>();

export default async () => {
  app.use(async ({ request }, next) => {
    log(
      ConsoleColor.Green,
      "[Oak]",
      ConsoleColor.Bright,
      httpMethodColors[request.method],
      request.method,
      ConsoleColor.Reset,
      "-",
      ConsoleColor.Cyan,
      request.url.pathname,
      ConsoleColor.Reset
    );

    await next();
  });

  app.use(async ({ state, request }, next) => {
    const jwt = request.headers.get("Authorization")?.replace("BEARER ", "");
    if (jwt) {
      const payload = await decodeJwt(jwt);

      if (payload) state.userId = payload.sub;
    }
    await next();
  });

  router.get("/test", async (ctx) => {
    ctx.response.headers.append(
      "Access-Control-Allow-Origin",
      "http://localhost:5173"
    );

    try {
      ctx.response.type = "audio/opus;codecs=opus";
      ctx.response.status = 200;

      const stream = bot.audio.streams["585619492608933888"];

      // const ffmpegProcess = new Deno.Command("ffmpeg", {
      //   args: [
      //     "-f",
      //     "s16le",

      //     "-ac",
      //     CHANNELS.toString(),
      //     "-ar",
      //     SAMPLE_RATE.toString(),

      //     "-i",
      //     "pipe:0",

      //     "-b:a",
      //     "128k",

      //     "-f",
      //     "webm",

      //     "pipe:1",
      //   ],
      //   stdin: "piped",
      //   stdout: "piped",
      // }).spawn();

      const opusIterator = (async function* () {
        while (true) {
          const streamPacket = await new Promise((resolve) => {
            stream.once(AudioStreamEvent.PacketPrepare, (streamPacket) => {
              resolve(streamPacket);
            });
          });

          yield streamPacket;
        }
      })();

      ctx.response.body = opusIterator;
    } catch (err: any) {
      console.error(err);
    }
  });

  app.use(async (ctx, next) => {
    if (
      ctx.request.url.pathname.startsWith("/internal") &&
      ctx.state.userId !== "internal"
    ) {
      return forbiddenError()(ctx);
    }

    await next();
  });

  await import("./routes.ts");

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.addEventListener("listen", ({ port }) => {
    log("[Oak]", `Listening on ${port}`);
  });

  app.listen(config.oak.listenOptions);
};
