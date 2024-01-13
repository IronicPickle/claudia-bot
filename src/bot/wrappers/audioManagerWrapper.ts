import { Bot } from "../../deps/discordeno.ts";
import { AudioBot } from "../../lib/ts/audio.ts";
import { EventManagerBot } from "../../lib/ts/eventManagerBot.ts";

export default <B extends Bot & EventManagerBot>(bot: B) => {
  const wrappedBot = bot as B & AudioBot;

  wrappedBot.audio = {
    streams: {},
    players: {},
  };

  return wrappedBot;
};
