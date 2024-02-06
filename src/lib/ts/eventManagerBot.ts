import BotEventManager from "@bot/managers/BotEventManager.ts";
import { Bot } from "discordeno";

export interface EventManagerBot extends Bot {
  eventManager: BotEventManager;
}
