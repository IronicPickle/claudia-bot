import { bot } from "@bot/setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "resume",
    {
      description: "Resume the current track.",
    },
    async (interaction) => {
      const { guildId, channelId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      if (!player.stream.getCurrentTrack())
        return "There is no track playing at the moment.";

      if (!player.stream.getIsPaused())
        return "The current track is already playing.";

      player.setBroadcastChannel(channelId);
      player.stream.resumeTrack();

      return "I've told the audio player to resume the current track.";
    }
  );
};
