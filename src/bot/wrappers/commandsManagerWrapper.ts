import { Bot } from "../../deps/discordeno.ts";
import { CommandManagerBot } from "../../lib/ts/commandManagerBot.ts";
import BotCommandManager from "../managers/BotCommandManager.ts";

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & CommandManagerBot;

  wrappedBot.commandManager = new BotCommandManager(bot);

  return wrappedBot;
};
