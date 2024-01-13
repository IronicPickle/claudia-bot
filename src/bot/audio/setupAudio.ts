import { FRAME_LENGTH } from "../../lib/constants/audio.ts";
import AudioPlayer from "../../lib/objects/AudioPlayer.ts";
import AudioStream from "../../lib/objects/AudioStream.ts";
import { bot } from "../setupBot.ts";

export default () => {
  bot.eventManager.on("guildCreate", (_, { id, voiceStates }) => {
    const stream = new AudioStream();
    const player = new AudioPlayer(bot, stream, id);

    // player.addEventListener("userJoin", () => {
    //   player.playFile(path.join(benDir, "user_joined.ogg"));
    // });

    // player.addEventListener("userLeave", () => {
    //   player.playFile(path.join(benDir, "user_left.ogg"));
    // });

    bot.audio.streams[id.toString()] = stream;
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

    const streams = Object.values(bot.audio.streams);

    for (const stream of streams) {
      if (stream.canDispatch()) stream.dispatchPacket();
    }

    processStreams(streams);
  };

  const processStreams = (streams: AudioStream[]) => {
    const stream = streams.shift();

    if (!stream) {
      return setTimeout(() => {
        dispatchPackets();
      }, nextTime - Date.now());
    }

    if (stream.canPrepare()) stream.preparePacket();

    processStreams(streams);
  };

  dispatchPackets();
};
