import { FRAME_LENGTH } from "../../lib/constants/audio.ts";
import AudioPlayer from "../../lib/objects/AudioPlayer.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.on("guildCreate", (_, { id, voiceStates }) => {
    const player = new AudioPlayer(bot, id);
    bot.audio.players[id.toString()] = player;

    for (const [userId, voiceState] of voiceStates) {
      player.updateVoiceUserChannel(userId, voiceState.channelId);
    }
  });

  bot.eventManager.on("guildDelete", (_, id) => {
    delete bot.audio.players[id.toString()];
  });

  bot.eventManager.on(
    "voiceStateUpdate",
    async (_, { channelId, sessionId, userId, guildId }) => {
      const player = bot.audio.players[guildId.toString()];

      player.updateVoiceUserChannel(userId, channelId);

      if (bot.id !== userId) return;

      if (!channelId) {
        player.closeSockets();
        return;
      }

      player.setWsSessionDetails({
        channelId,
        sessionId,
        userId,
      });
    }
  );

  bot.eventManager.on(
    "voiceServerUpdate",
    (_, { token, endpoint, guildId }) => {
      const player = bot.audio.players[guildId.toString()];

      if (!endpoint) {
        player.closeSockets();
        return;
      }

      player.setWsServerDetails({
        token,
        endpoint,
      });
    }
  );

  let nextTime = Date.now();

  const dipsatchPackets = () => {
    nextTime += FRAME_LENGTH;

    const players = Object.values(bot.audio.players);

    for (const player of players) {
      if (player.canDispatch()) player.dispatchPacket();
    }

    processPlayers(players);
  };

  const processPlayers = (players: AudioPlayer[]) => {
    const player = players.shift();

    if (!player)
      return setTimeout(() => {
        dipsatchPackets();
      }, nextTime - Date.now());

    if (player.canPrepare()) player.preparePacket();

    setTimeout(() => processPlayers(players), 0);
  };

  dipsatchPackets();
};
