import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "play",
    {
      description: "Play test.",
      defaultMemberPermissions: [],
    },
    async (interaction) => {
      const { guildId } = interaction;

      if (!guildId) return "Invalid input";

      const guildConfig = bot.configManager.getGuildConfig(guildId);
      if (!guildConfig) return "No config found for guild.";

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];

      await player.joinChannel(bot, BigInt("876115525917360178"));

      player.enqueue();

      return "Success";
    }
  );
};
