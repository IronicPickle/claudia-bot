import {
  ApplicationCommandOptionTypes,
  InteractionResponseTypes,
} from "discordeno";
import {
  audioSourceTypeColors,
  audioSourceTypeNames,
} from "@constants/generic.ts";
import { parseCommandOptions } from "@utils/generic.ts";
import { bot } from "@bot/setupBot.ts";

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
      const { guildId, channelId, user, data: { options } = {} } = interaction;

      const { query: queryOption } = parseCommandOptions<{
        query: string;
      }>(options);

      const query = queryOption.value;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];
      const userChannelId = player.getVoiceUserChannel(user.id);

      if (!userChannelId)
        return "You must be in a voice channel to play a track.";

      player.setBroadcastChannel(channelId);
      await player.joinChannel(bot, userChannelId);
      const audioSource = await player.stream.queueTrack(
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
