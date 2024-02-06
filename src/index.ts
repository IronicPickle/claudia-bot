import config, { env } from "@config/config.ts";
import { log } from "@utils/generic.ts";
import setupBot from "@bot/setupBot.ts";
import setupOak from "@oak/setupOak.ts";

const start = () => {
  if (!config.authSecret) throw Error("AUTH_SECRET missing in env!");
  if (!config.discord.token) throw Error("DISCORD_TOKEN missing in env!");

  log("Deno Version", "-", Deno.version);
  log("Starting server", "-", env.toUpperCase());
  log(config);

  setupBot();
  setupOak();
};

start();
