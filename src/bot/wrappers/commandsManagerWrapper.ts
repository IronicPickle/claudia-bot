import { Bot } from "discordeno";
import { CommandManagerBot } from "@ts/commandManagerBot.ts";
import BotCommandManager from "@bot/managers/BotCommandManager.ts";

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & CommandManagerBot;

  wrappedBot.commandManager = new BotCommandManager(bot);

  return wrappedBot;
};
