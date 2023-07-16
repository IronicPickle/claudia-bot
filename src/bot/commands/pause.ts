import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "pause",
    {
      description: "Pause the current track.",
    },
    async (interaction) => {
      const { guildId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];

      if (!player.getCurrentTrack())
        return "There is no track playing at the moment.";

      if (player.getIsPaused()) return "The current track is already paused.";

      player.pauseTrack();

      return "I've told the audio player to pause the current track.";
    }
  );
};
