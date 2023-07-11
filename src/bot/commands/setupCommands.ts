import { bot } from "../setupBot.ts";
import getTime from "./getTime.ts";
import listGuildConfig from "./listGuildConfig.ts";
import play from "./play.ts";
import seek from "./seek.ts";
import setSampleRate from "./setSampleRate.ts";
import skip from "./skip.ts";

export default async () => {
  await listGuildConfig();
  await play();
  await skip();
  await seek();
  await getTime();
  await setSampleRate();

  bot.commandManager.registerListener();
};
