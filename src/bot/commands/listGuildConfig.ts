import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "list-guild-config",
    {
      description: "List all the currently configured update repositories.",
      defaultMemberPermissions: ["ADMINISTRATOR"],
    },
    async (interaction) => {
      const { guildId } = interaction;

      if (!guildId) return "Invalid input";

      const guildConfig = bot.configManager.getGuildConfig(guildId);
      if (!guildConfig) return "No config found for guild.";

      return `**Guild Config**

${JSON.stringify(guildConfig)}`;
    }
  );
};
