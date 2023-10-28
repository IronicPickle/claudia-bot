import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import {
  audioSourceTrebleNames,
  audioSourceTrebleValues,
} from "../../lib/constants/audio.ts";
import { AudioSourceFilterStep } from "../../lib/enums/audio.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "set-treble",
    {
      description: "Set the treble.",
      options: [
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "treble",
          description: "Treble - Leave empty to reset",
          choices: [
            {
              name: audioSourceTrebleNames[AudioSourceFilterStep.High3],
              value: AudioSourceFilterStep.High3,
            },
            {
              name: audioSourceTrebleNames[AudioSourceFilterStep.High2],
              value: AudioSourceFilterStep.High2,
            },
            {
              name: audioSourceTrebleNames[AudioSourceFilterStep.High1],
              value: AudioSourceFilterStep.High1,
            },
            {
              name: audioSourceTrebleNames[AudioSourceFilterStep.Normal],
              value: AudioSourceFilterStep.Normal,
            },
          ],
        },
      ],
    },
    async (interaction) => {
      const { guildId, channelId, data: { options } = {} } = interaction;

      const { treble: trebleOption } = parseCommandOptions<{
        treble: AudioSourceFilterStep;
      }>(options);

      const trebleChoice = (trebleOption?.value ??
        AudioSourceFilterStep.Normal) as AudioSourceFilterStep;
      const trebleValue = audioSourceTrebleValues[trebleChoice];
      const trebleName = audioSourceTrebleNames[trebleChoice];

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      player.setBroadcastChannel(channelId);
      player.setFilters({
        treble: trebleValue,
      });

      return `I've told the audio player to use the treble to ${trebleName}`;
    }
  );
};
