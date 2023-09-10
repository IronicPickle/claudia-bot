import {
  ApplicationCommandOptionTypes,
  InteractionResponseTypes,
} from "../../deps/discordeno.ts";
import {
  audioSourceTypeColors,
  audioSourceTypeNames,
} from "../../lib/constants/generic.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "play",
    {
      description: "Queue a track.",
      options: [
        {
          type: ApplicationCommandOptionTypes.String,
          name: "query",
          description:
            "Can be a track name or, a YouTube, Spotify or Soundcloud URL.",
          required: true,
        },
      ],
    },
    async (interaction) => {
      const { guildId, user, data: { options } = {} } = interaction;

      const { query: queryOption } = parseCommandOptions<{
        query: string;
      }>(options);

      const query = queryOption.value;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];
      const channelId = player.getVoiceUserChannel(user.id);

      if (!channelId) return "You must be in a voice channel to play a track.";

      await player.joinChannel(bot, channelId);
      const audioSource = await player.queueTrack(
        query,
        interaction.channelId,
        interaction.user.id
      );

      if (!audioSource)
        return "The audio player was unable to process that track.";

      return {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          embeds: [
            {
              author: {
                name: "⏳ Downloading, please wait...",
              },
              color: parseInt(
                audioSourceTypeColors[audioSource.sourceDetails.type]
              ),
              title: `Pulling from ${
                audioSourceTypeNames[audioSource.sourceDetails.type]
              }`,
            },
          ],
        },
      };
    }
  );
};
