import config, { env } from "./config/config.ts";
import { log } from "./lib/utils/generic.ts";
import setupBot from "./bot/setupBot.ts";
import setupOak from "./oak/setupOak.ts";

const start = () => {
  log("Deno Version", "-", Deno.version);
  log("Starting server", "-", env.toUpperCase());
  log(config);

  setupBot();
  setupOak();
};

start();
