import { Bot } from "../../deps/discordeno.ts";
import { ConfigManagerBot } from "../../lib/ts/configManagerBot.ts";
import BotConfigManager from "../managers/BotConfigManager.ts";

export default <B extends Bot>(bot: B) => {
  const wrappedBot = bot as B & ConfigManagerBot;

  wrappedBot.configManager = new BotConfigManager();

  return wrappedBot;
};
