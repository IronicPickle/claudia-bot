import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "skip",
    {
      description: "Skip the current track.",
      defaultMemberPermissions: ["ADMINISTRATOR"],
    },
    async (interaction) => {
      const { guildId, user } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];
      const channelId = player.getVoiceUserChannel(user.id);

      if (!channelId) return "You must be in a voice channel to skip a track.";

      if (!player.getCurrentTrack())
        return "There is no track playing at the moment.";

      player.skipTrack();

      return "I've told the audio player to skip this track.";
    }
  );
};
