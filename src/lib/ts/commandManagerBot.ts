import BotCommandManager from "@bot/managers/BotCommandManager.ts";
import { Bot } from "discordeno";

export interface CommandManagerBot extends Bot {
  commandManager: BotCommandManager;
}
