import { InteractionResponseTypes } from "../../deps/discordeno.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "get-queue",
    {
      description: "List the next 10 tracks in the queue.",
    },
    // @ts-ignore: discordeno uses wrong type here, should be string
    async (interaction) => {
      const { guildId, channelId } = interaction;

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used in a server.";

      const player = bot.audio.players[guildId.toString()];

      if (!player.stream.getCurrentTrack())
        return "There is no track playing at the moment.";

      player.setBroadcastChannel(channelId);
      const queue = player.stream.getQueue().slice(0, 10);

      const fields = queue.map(({ sourceDetails }) => ({
        name: sourceDetails.title,
        value: sourceDetails.artist,
      }));

      return {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          embeds: [
            {
              author: {
                name: "➡️ Current queue",
              },
              color: parseInt("0x3B88C3"),
              fields,
            },
          ],
        },
      };
    }
  );
};
