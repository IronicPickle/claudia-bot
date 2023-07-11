import { ApplicationCommandOptionTypes } from "../../deps/discordeno.ts";
import {
  audioSourcePitchNames,
  audioSourcePitchValues,
} from "../../lib/constants/audio.ts";
import { AudioSourcePitch } from "../../lib/enums/audio.ts";
import { parseCommandOptions } from "../../lib/utils/generic.ts";
import { bot } from "../setupBot.ts";

export default async () => {
  await bot.commandManager.saveCommand(
    "set-pitch",
    {
      description: "Set the pitch.",
      options: [
        {
          type: ApplicationCommandOptionTypes.String,
          name: "pitch",
          description: "Pitch - Leave empty to reset",
          required: true,
          choices: [
            {
              name: "Weeb",
              value: AudioSourcePitch.Weeb,
            },
            {
              name: "Normal",
              value: AudioSourcePitch.Normal,
            },

            {
              name: "Death Gargle",
              value: AudioSourcePitch.DeathGargle,
            },
          ],
        },
      ],
    },
    async (interaction) => {
      const { guildId, user, data: { options } = {} } = interaction;

      const { pitch: pitchOption } = parseCommandOptions<{
        pitch: AudioSourcePitch;
      }>(options);

      const pitchChoice = (pitchOption.value ??
        AudioSourcePitch.Normal) as AudioSourcePitch;
      const pitchValue = audioSourcePitchValues[pitchChoice];
      const pitchName = audioSourcePitchNames[pitchChoice];

      if (!guildId) return "Invalid input";

      if (!interaction.member) return "This command must be used it a server.";

      const player = bot.audio.players[guildId.toString()];
      const channelId = player.getVoiceUserChannel(user.id);

      if (!channelId)
        return "You must be in a voice channel to set the filters for a track.";

      const currentTrack = player.getCurrentTrack();

      if (!currentTrack) return "There is no track playing at the moment.";

      player.setFilters({
        pitch: pitchValue,
      });

      return `I've told the audio player to use the new pitch to ${pitchName}`;
    }
  );
};
