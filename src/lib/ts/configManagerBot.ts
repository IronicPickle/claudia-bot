import BotConfigManager from "@bot/managers/BotConfigManager.ts";
import { Bot } from "discordeno";

export interface ConfigManagerBot extends Bot {
  configManager: BotConfigManager;
}
