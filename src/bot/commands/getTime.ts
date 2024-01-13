import { parseTime } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "get-time",
    {
      description: "Gets the current time of the track playing.",
    },
    async (interaction) => {
      const { guildId, channelId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      player.setBroadcastChannel(channelId);
      const currentTime = player.stream.getCurrentTrackTime();

      if (!currentTime) return "There is no track playing at the moment.";

      const { hoursPadded, minutesPadded, secondsPadded } =
        parseTime(currentTime);

      return `The current track is at ${hoursPadded}:${minutesPadded}:${secondsPadded}.`;
    }
  );
};
