import config from "@config/config.ts";
import { log } from "@utils/generic.ts";
import setupEvents from "@bot/events/setupEvents.ts";
import setupCommands from "@bot/commands/setupCommands.ts";
import { createBot, Intents, startBot } from "discordeno";
import audioManagerWrapper from "@bot/wrappers/audioManagerWrapper.ts";
import eventManagerWrapper from "@bot/wrappers/eventManagerWrapper.ts";
import commandsManagerWrapper from "@bot/wrappers/commandsManagerWrapper.ts";
import configManagerWrapper from "@bot/wrappers/configManagerWrapper.ts";
import setupAudio from "@bot/audio/setupAudio.ts";
import sodium from "sodium";
import cacheWrapper from "@bot/wrappers/cacheWrapper.ts";
import startupSetup from "../startupSetup.ts";

await sodium.ready;

if (!config.discord.token) throw Error("A discord token is required");
if (!config.discord.botId) throw Error("A bot ID is required");

export const bot = cacheWrapper(
  configManagerWrapper(
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
  )
);

export default async () => {
  bot.eventManager.addEventListener("ready", (_bot, { user }) => {
    log("[Bot]", `Bot logged in as '${user.username}'`);

    setupEvents();
    setupCommands();
    setupAudio();

    startupSetup();
  });

  await startBot(bot);
};
