import { bot } from "@bot/setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "join",
    {
      description: "Connect the bot to your channel.",
    },
    async (interaction) => {
      const { guildId, channelId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      const userChannelId = player.getVoiceUserChannel(interaction.user.id);

      if (!userChannelId) return "You're not in a voice channel.";

      if (player.getBotVoiceChannelId() === userChannelId)
        return "I'm already in your channel.";

      player.setBroadcastChannel(channelId);
      await player.joinChannel(bot, userChannelId);

      return "I'll be right there!";
    }
  );
};
