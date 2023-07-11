import { AudioSourcePitch } from "../enums/audio.ts";

export const SAMPLE_RATE = 48000;
export const FRAME_LENGTH = 20;
export const FPS = 1000 / FRAME_LENGTH; // Frames per second
export const CHANNELS = 2;
export const FRAME_SIZE = SAMPLE_RATE / FPS; // Samples per frame

export const audioSourcePitchValues = {
  [AudioSourcePitch.Weeb]: 1.25,
  [AudioSourcePitch.Normal]: 1,
  [AudioSourcePitch.DeathGargle]: 0.75,
};

export const audioSourcePitchNames = {
  [AudioSourcePitch.Weeb]: "Weeb",
  [AudioSourcePitch.Normal]: "Normal",
  [AudioSourcePitch.DeathGargle]: "Death Gargle",
};
