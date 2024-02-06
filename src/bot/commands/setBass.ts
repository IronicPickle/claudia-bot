import { ApplicationCommandOptionTypes } from "discordeno";
import {
  audioSourceBassNames,
  audioSourceBassValues,
} from "@constants/audio.ts";
import { AudioSourceFilterStep } from "@enums/audio.ts";
import { parseCommandOptions } from "@utils/generic.ts";
import { bot } from "@bot/setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "set-bass",
    {
      description: "Set the bass.",
      options: [
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "bass",
          description: "Bass - Leave empty to reset",
          choices: [
            {
              name: audioSourceBassNames[AudioSourceFilterStep.High3],
              value: AudioSourceFilterStep.High3,
            },
            {
              name: audioSourceBassNames[AudioSourceFilterStep.High2],
              value: AudioSourceFilterStep.High2,
            },
            {
              name: audioSourceBassNames[AudioSourceFilterStep.High1],
              value: AudioSourceFilterStep.High1,
            },
            {
              name: audioSourceBassNames[AudioSourceFilterStep.Normal],
              value: AudioSourceFilterStep.Normal,
            },
          ],
        },
      ],
    },
    async (interaction) => {
      const { guildId, channelId, data: { options } = {} } = interaction;

      const { bass: bassOption } = parseCommandOptions<{
        bass: AudioSourceFilterStep;
      }>(options);

      const bassChoice = (bassOption?.value ??
        AudioSourceFilterStep.Normal) as AudioSourceFilterStep;
      const bassValue = audioSourceBassValues[bassChoice];
      const bassName = audioSourceBassNames[bassChoice];

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      player.setBroadcastChannel(channelId);
      player.stream.setFilters({
        bass: bassValue,
      });

      return `I've told the audio player to use the bass to ${bassName}`;
    }
  );
};
