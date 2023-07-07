import { bot } from "../setupBot.ts";
import listGuildConfig from "./listGuildConfig.ts";
import play from "./play.ts";

export default async () => {
  await listGuildConfig();
  await play();

  bot.commandManager.registerListener();
};
