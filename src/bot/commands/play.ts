import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "play",
    {
      description: "Queue a track.",
      defaultMemberPermissions: [],
      options: [
        {
          type: ApplicationCommandOptionTypes.String,
          name: "query",
          description: "Can be either a YouTube, Spotify or Soundcloud URL.",
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

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];
      const channelId = player.getVoiceUserChannel(user.id);

      if (!channelId) return "You must be in a voice channel to play a track.";

      await player.joinChannel(bot, channelId);
      const audioSource = await player.queueTrack(query, interaction.channelId);

      if (!audioSource)
        return "The audio player was unable to process that track.";

      return "I've sent your track to the audio player. Please wait...";
    }
  );
};
