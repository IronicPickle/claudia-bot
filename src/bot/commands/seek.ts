import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import { parseCommandOptions, parseTime } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "seek",
    {
      description: "Seek to a specific part of a song.",
      options: [
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "seconds",
          description: "Seconds",
          required: true,
          maxValue: 59,
          minValue: 0,
        },
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "minutes",
          description: "Minutes",
          maxValue: 59,
          minValue: 0,
        },
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "hours",
          description: "Hours",
          maxValue: 59,
          minValue: 0,
        },
      ],
    },
    async (interaction) => {
      const { guildId, channelId, data: { options } = {} } = interaction;

      const {
        hours: hoursOption,
        minutes: minutesOption,
        seconds: secondsOption,
      } = parseCommandOptions<{
        hours?: number;
        minutes?: number;
        seconds: number;
      }>(options);

      const seconds = secondsOption.value ?? 0;
      const minutes = minutesOption?.value ?? 0;
      const hours = hoursOption?.value ?? 0;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      const currentTrack = player.stream.getCurrentTrack();

      if (!currentTrack) return "There is no track playing at the moment.";

      const { duration } = currentTrack.sourceDetails;

      if (duration == null)
        return "The audio player was unable to get a duration for this track, thus we cannot safely seek.";

      const secondsTotal = seconds + minutes * 60 + hours * 60 * 60;

      const parsedDuration = parseTime(Math.floor(duration));

      if (secondsTotal > Math.floor(duration))
        return `You cannot seek beyond ${parsedDuration.hoursPadded}:${parsedDuration.minutesPadded}:${parsedDuration.secondsPadded} on this track.`;

      player.setBroadcastChannel(channelId);
      player.stream.seek(secondsTotal);

      const parsedSecondsTotal = parseTime(secondsTotal);

      return `I've told the audio player to seek to ${parsedSecondsTotal.hoursPadded}:${parsedSecondsTotal.minutesPadded}:${parsedSecondsTotal.secondsPadded}.`;
    }
  );
};
