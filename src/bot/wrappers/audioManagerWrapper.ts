import { Bot } from "discordeno";
import { AudioBot } from "@ts/audio.ts";
import { EventManagerBot } from "@ts/eventManagerBot.ts";

export default <B extends Bot & EventManagerBot>(bot: B) => {
  const wrappedBot = bot as B & AudioBot;

  wrappedBot.audio = {
    streams: {},
    players: {},
  };

  return wrappedBot;
};
