import BotCommandManager from "../../bot/managers/BotCommandManager.ts";
import { Bot } from "../../deps/discordeno.ts";

export interface CommandManagerBot extends Bot {
  commandManager: BotCommandManager;
}
