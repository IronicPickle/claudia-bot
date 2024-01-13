import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "skip",
    {
      description: "Skip the current track.",
    },
    async (interaction) => {
      const { guildId, channelId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      if (!player.stream.getCurrentTrack())
        return "There is no track playing at the moment.";

      player.setBroadcastChannel(channelId);
      player.stream.skipTrack();

      return "I've told the audio player to skip this track.";
    }
  );
};
