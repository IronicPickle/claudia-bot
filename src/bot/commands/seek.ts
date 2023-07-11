import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import { parseCommandOptions, parseTime } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "seek",
    {
      description: "Seek to a specific part of a song.",
      defaultMemberPermissions: ["ADMINISTRATOR"],
      options: [
        {
          type: ApplicationCommandOptionTypes.Number,
          name: "seconds",
          description: "Seconds",
          required: true,
          maxValue: 59,
          minValue: 0,
        },
        {
          type: ApplicationCommandOptionTypes.Number,
          name: "minutes",
          description: "Minutes",
          maxValue: 59,
          minValue: 0,
        },
        {
          type: ApplicationCommandOptionTypes.Number,
          name: "hours",
          description: "Hours",
          maxValue: 59,
          minValue: 0,
        },
      ],
    },
    async (interaction) => {
      const { guildId, user, data: { options } = {} } = interaction;

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

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];
      const channelId = player.getVoiceUserChannel(user.id);

      if (!channelId) return "You must be in a voice channel to seek a track.";

      const currentTrack = player.getCurrentTrack();

      if (!currentTrack) return "There is no track playing at the moment.";

      const { duration } = currentTrack.sourceDetails;

      if (duration == null)
        return "The audio player was unable to get a duration for this track, thus we cannot safely seek.";

      const secondsTotal = seconds + minutes * 60 + hours * 60 * 60;

      const parsedDuration = parseTime(Math.floor(duration));

      if (secondsTotal > Math.floor(duration))
        return `You cannot seek beyond ${parsedDuration.hoursPadded}:${parsedDuration.minutesPadded}:${parsedDuration.secondsPadded} on this track.`;

      player.seek(secondsTotal);

      const parsedSecondsTotal = parseTime(secondsTotal);

      return `I've told the audio player to seek to ${parsedSecondsTotal.hoursPadded}:${parsedSecondsTotal.minutesPadded}:${parsedSecondsTotal.secondsPadded}.`;
    }
  );
};
