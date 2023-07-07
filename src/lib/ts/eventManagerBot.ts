import BotEventManager from "../../bot/managers/BotEventManager.ts";
import { Bot } from "../../deps/discordeno.ts";

export interface EventManagerBot extends Bot {
  eventManager: BotEventManager;
}
