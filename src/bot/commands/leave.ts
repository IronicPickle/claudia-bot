import { bot } from "@bot/setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "leave",
    {
      description: "Disconnect the bot from the channel.",
    },
    async (interaction) => {
      const { guildId, channelId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      if (!player.getBotVoiceChannelId())
        return "I'm not currently in a channel.";

      player.setBroadcastChannel(channelId);
      await player.leaveChannel();

      return "I'll leave...";
    }
  );
};
