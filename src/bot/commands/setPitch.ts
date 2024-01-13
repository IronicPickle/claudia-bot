import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import {
  audioSourcePitchNames,
  audioSourcePitchValues,
} from "../../lib/constants/audio.ts";
import { AudioSourceFilterStep } from "../../lib/enums/audio.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "set-pitch",
    {
      description: "Set the pitch.",
      options: [
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "pitch",
          description: "Pitch - Leave empty to reset",
          choices: [
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.High3],
              value: AudioSourceFilterStep.High3,
            },
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.High2],
              value: AudioSourceFilterStep.High2,
            },
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.High1],
              value: AudioSourceFilterStep.High1,
            },
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.Normal],
              value: AudioSourceFilterStep.Normal,
            },
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.Low1],
              value: AudioSourceFilterStep.Low1,
            },
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.Low2],
              value: AudioSourceFilterStep.Low2,
            },
            {
              name: audioSourcePitchNames[AudioSourceFilterStep.Low3],
              value: AudioSourceFilterStep.Low3,
            },
          ],
        },
      ],
    },
    async (interaction) => {
      const { guildId, channelId, data: { options } = {} } = interaction;

      const { pitch: pitchOption } = parseCommandOptions<{
        pitch: AudioSourceFilterStep;
      }>(options);

      const pitchChoice = (pitchOption?.value ??
        AudioSourceFilterStep.Normal) as AudioSourceFilterStep;
      const pitchValue = audioSourcePitchValues[pitchChoice];
      const pitchName = audioSourcePitchNames[pitchChoice];

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      player.setBroadcastChannel(channelId);
      player.stream.setFilters({
        pitch: pitchValue,
      });

      return `I've told the audio player to use the pitch to ${pitchName}`;
    }
  );
};
