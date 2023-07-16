import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import { defaultFilters } from "../../lib/objects/AudioPlayer.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "volume",
    {
      description: "Set the volume of player.",
      options: [
        {
          type: ApplicationCommandOptionTypes.Integer,
          name: "volume",
          description: "Volume (0 - 100) - Leave empty to reset",
          maxValue: 100,
          minValue: 0,
        },
      ],
    },
    async (interaction) => {
      const { guildId, data: { options } = {} } = interaction;

      const { volume: volumeOption } = parseCommandOptions<{
        volume?: number;
      }>(options);

      const volume = volumeOption?.value ?? defaultFilters.volume;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];

      player.setFilters({
        volume,
      });

      return `I've told the audio player to set the volume to ${volume}.`;
    }
  );
};
