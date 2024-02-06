import { Bot } from "discordeno";
import { EventManagerBot } from "@ts/eventManagerBot.ts";
import BotEventManager from "@bot/managers/BotEventManager.ts";

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & EventManagerBot;

  wrappedBot.eventManager = new BotEventManager(bot);

  return wrappedBot;
};
