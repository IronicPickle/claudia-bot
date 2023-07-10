import { bot } from "../setupBot.ts";
import listGuildConfig from "./listGuildConfig.ts";
import play from "./play.ts";
import skip from "./skip.ts";

export default async () => {
  await listGuildConfig();
  await play();
  await skip();

  bot.commandManager.registerListener();
};
