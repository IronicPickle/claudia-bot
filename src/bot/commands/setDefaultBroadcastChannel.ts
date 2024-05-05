import { bot } from "@bot/setupBot.ts";
import { ApplicationCommandOptionTypes, Channel } from "discordeno";
import { parseCommandOptions } from "@utils/generic.ts";
import { isString } from "@shared/lib/utils/generic.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "set-default-broadcast-channel",
    {
      description: "Set the default channel events should be broadcast to.",
      defaultMemberPermissions: ["ADMINISTRATOR"],
      options: [
        {
          type: ApplicationCommandOptionTypes.Channel,
          name: "channel",
          description: "The broadcast channel",
        },
      ],
    },
    async (interaction) => {
      const { guildId, data: { options } = {} } = interaction;

      const { channel: channelOption } = parseCommandOptions<{
        channel: string;
      }>(options);

      const channelId = channelOption.value;

      if (!guildId || !isString(channelId)) return "Invalid input";

      const guildConfig = bot.configManager.getGuildConfig(guildId);
      if (!guildConfig) return "No config found for guild.";

      guildConfig.defaultBroadcastChannelId = channelId;

      bot.configManager.updateGuildConfig(guildId, guildConfig);

      return `Default broadcast channel set to <#${channelId}>`;
    }
  );
};
