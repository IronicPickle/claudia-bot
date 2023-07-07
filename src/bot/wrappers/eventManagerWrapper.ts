import { Bot } from "../../deps/discordeno.ts";
import { EventManagerBot } from "../../lib/ts/eventManagerBot.ts";
import BotEventManager from "../managers/BotEventManager.ts";

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & EventManagerBot;

  wrappedBot.eventManager = new BotEventManager(bot);

  return wrappedBot;
};
