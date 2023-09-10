import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "stop",
    {
      description: "Stop the audio player and clear the queue.",
    },
    async (interaction) => {
      const { guildId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      if (!player.getCurrentTrack())
        return "There is no track playing at the moment.";

      await player.stopTrack();

      return "I've told the audio player to stop playing and clear the queue.";
    }
  );
};
