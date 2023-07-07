import BotConfigManager from "../../bot/managers/BotConfigManager.ts";
import { Bot } from "../../deps/discordeno.ts";

export interface ConfigManagerBot extends Bot {
  configManager: BotConfigManager;
}
