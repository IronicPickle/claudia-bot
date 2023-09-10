import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import { bot } from "../setupBot.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";

let nicknamingInProgress = false;

export default async () => {
  await bot.commandManager.saveCommand(
    "mass-nickname",
    {
      description: "Mass nickname the whole server.",
      defaultMemberPermissions: ["MANAGE_NICKNAMES"],
      options: [
        {
          type: ApplicationCommandOptionTypes.String,
          name: "nickname",
          description: "The nickname to use. (Leave empty to reset)",
        },
      ],
    },
    async (interaction) => {
      const { guildId, data: { options } = {} } = interaction;

      const { nickname: nicknameOption } = parseCommandOptions<{
        nickname?: string;
      }>(options);

      const nickname = nicknameOption?.value ?? null;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      await bot.helpers.fetchMembers(guildId);

      const members = await bot.helpers.getMembers(guildId, {
        limit: 1000,
      });

      if (nicknamingInProgress)
        return "A mass nicknamaing is already in progress.";

      (async () => {
        nicknamingInProgress = true;
        for (const [_, member] of members) {
          if (!member.user) continue;

          if (member.nick === nickname) continue;

          try {
            await bot.helpers.editMember(guildId, member.user.id, {
              nick: nickname,
            });
            if (!interaction.channelId) continue;
            bot.helpers.sendMessage(interaction.channelId, {
              content: !nickname
                ? `> Reset ${member.user.username}'s nickname`
                : `> Renamed ${member.user.username} to ${nickname}`,
            });
          } catch (_err: any) {
            continue;
          }
        }

        if (!interaction.channelId) return;
        bot.helpers.sendMessage(interaction.channelId, {
          content: `## Renaming complete!`,
        });

        nicknamingInProgress = false;
      })();

      return "## The mass renaming will begin now.";
    }
  );
};
