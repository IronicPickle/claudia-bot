import { ApplicationCommandOptionTypes } from "discordeno";
import { defaultFilters } from "@objects/AudioStream.ts";
import { parseCommandOptions } from "@utils/generic.ts";
import { bot } from "@bot/setupBot.ts";

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
      const { guildId, channelId, data: { options } = {} } = interaction;

      const { volume: volumeOption } = parseCommandOptions<{
        volume?: number;
      }>(options);

      const volume = volumeOption?.value ?? defaultFilters.volume;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      player.setBroadcastChannel(channelId);
      player.stream.setFilters({
        volume,
      });

      return `I've told the audio player to set the volume to ${volume}.`;
    }
  );
};
