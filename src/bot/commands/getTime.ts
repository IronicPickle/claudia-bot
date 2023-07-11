import { parseTime } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "get-time",
    {
      description: "Gets the current time of the track playing.",
    },
    async (interaction) => {
      const { guildId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];

      const currentTime = player.getCurrentTrackTime();

      if (!currentTime) return "There is no track playing at the moment.";

      const { hoursPadded, minutesPadded, secondsPadded } =
        parseTime(currentTime);

      return `The current track is at ${hoursPadded}:${minutesPadded}:${secondsPadded}.`;
    }
  );
};
