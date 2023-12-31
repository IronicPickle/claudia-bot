import { path } from "../../deps/deps.ts";
import { FRAME_LENGTH } from "../../lib/constants/audio.ts";
import { benDir } from "../../lib/constants/generic.ts";
import AudioPlayer from "../../lib/objects/AudioPlayer.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.on("guildCreate", (_, { id, voiceStates }) => {
    const player = new AudioPlayer(bot, id);

    // player.addEventListener("userJoin", () => {
    //   player.playFile(path.join(benDir, "user_joined.ogg"));
    // });

    // player.addEventListener("userLeave", () => {
    //   player.playFile(path.join(benDir, "user_left.ogg"));
    // });

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
        player.resetSession();
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
        player.resetSession();
        return;
      }

      player.setWsServerDetails({
        token,
        endpoint,
      });
    }
  );

  let nextTime = Date.now();

  const dispatchPackets = () => {
    nextTime += FRAME_LENGTH;

    const players = Object.values(bot.audio.players);

    for (const player of players) {
      if (player.canDispatch()) player.dispatchPacket();
    }

    processPlayers(players);
  };

  const processPlayers = (players: AudioPlayer[]) => {
    const player = players.shift();

    if (!player) {
      return setTimeout(() => {
        dispatchPackets();
      }, nextTime - Date.now());
    }

    if (player.canPrepare()) player.preparePacket();

    processPlayers(players);
  };

  dispatchPackets();
};
