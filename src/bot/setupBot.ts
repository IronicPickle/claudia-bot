import config from "../config/config.ts";
import { log } from "../lib/utils/generic.ts";
import setupEvents from "./events/setupEvents.ts";
import setupCommands from "./commands/setupCommands.ts";
import { createBot, Intents, startBot } from "../deps/discordeno.ts";
import sodium from "../deps/sodium.ts";
import audioManagerWrapper from "./wrappers/audioManagerWrapper.ts";
import eventManagerWrapper from "./wrappers/eventManagerWrapper.ts";
import commandsManagerWrapper from "./wrappers/commandsManagerWrapper.ts";
import configManagerWrapper from "./wrappers/configManagerWrapper.ts";
import setupAudio from "./audio/setupAudio.ts";

await sodium.ready;

if (!config.discord.token) throw Error("A discord token is required");
if (!config.discord.botId) throw Error("A bot ID is required");

export const bot = configManagerWrapper(
  commandsManagerWrapper(
    audioManagerWrapper(
      eventManagerWrapper(
        createBot({
          token: config.discord.token,
          botId: config.discord.botId,
          intents:
            Intents.Guilds |
            Intents.GuildMessages |
            Intents.GuildVoiceStates |
            Intents.GuildMembers,
        })
      )
    )
  )
);

export default async () => {
  bot.eventManager.addEventListener("ready", (_bot, { user }) => {
    log("[Bot]", `Bot logged in as '${user.username}'`);

    setupEvents();
    setupCommands();
    setupAudio();
  });

  await startBot(bot);
};
