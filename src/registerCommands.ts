import commandsManagerWrapper from "./bot/wrappers/commandsManagerWrapper.ts";
import config from "./config/config.ts";
import { Intents, createBot } from "./deps/discordeno.ts";
import { log } from "./lib/utils/generic.ts";

if (!config.discord.token) throw Error("A discord token is required");
if (!config.discord.botId) throw Error("A bot ID is required");

const bot = commandsManagerWrapper(
  createBot({
    token: config.discord.token,
    botId: config.discord.botId,
    intents: Intents.Guilds,
  })
);

const start = async () => {
  log("Deno Version", "-", Deno.version);
  log(config);

  await bot.commandManager.registerCommands();
};

start();
