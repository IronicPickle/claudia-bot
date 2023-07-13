import { bot } from "../setupBot.ts";
import getTime from "./getTime.ts";
import listGuildConfig from "./listGuildConfig.ts";
import play from "./play.ts";
import seek from "./seek.ts";
import setPitch from "./setPitch.ts";
import skip from "./skip.ts";
import volume from "./volume.ts";

export default async () => {
  await listGuildConfig();
  await play();
  await skip();
  await seek();
  await getTime();
  await setPitch();
  await volume();

  bot.commandManager.registerListener();
};
