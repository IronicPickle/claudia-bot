import { AudioSourceFilterStep } from "../enums/audio.ts";

export const SAMPLE_RATE = 48000;
export const FRAME_LENGTH = 20;
export const FPS = 1000 / FRAME_LENGTH; // Frames per second
export const CHANNELS = 2;
export const FRAME_SIZE = SAMPLE_RATE / FPS; // Samples per frame

export const audioSourcePitchValues = {
  [AudioSourceFilterStep.High3]: 1.45,
  [AudioSourceFilterStep.High2]: 1.3,
  [AudioSourceFilterStep.High1]: 1.15,
  [AudioSourceFilterStep.Normal]: 1,
  [AudioSourceFilterStep.Low1]: 0.85,
  [AudioSourceFilterStep.Low2]: 0.7,
  [AudioSourceFilterStep.Low3]: 0.55,
};

export const audioSourcePitchNames = {
  [AudioSourceFilterStep.High3]: "Weeb Overdrive™",
  [AudioSourceFilterStep.High2]: "Weeb",
  [AudioSourceFilterStep.High1]: "Weeb Lite™",
  [AudioSourceFilterStep.Normal]: "Normal",
  [AudioSourceFilterStep.Low1]: "A Bit Sad",
  [AudioSourceFilterStep.Low2]: "Big Sad",
  [AudioSourceFilterStep.Low3]: "Death Gargle",
};

export const audioSourceBassValues = {
  [AudioSourceFilterStep.High3]: 15,
  [AudioSourceFilterStep.High2]: 5,
  [AudioSourceFilterStep.High1]: 2.5,
  [AudioSourceFilterStep.Normal]: 0,
  [AudioSourceFilterStep.Low1]: 0,
  [AudioSourceFilterStep.Low2]: 0,
  [AudioSourceFilterStep.Low3]: 0,
};

export const audioSourceBassNames = {
  [AudioSourceFilterStep.High3]: "WET",
  [AudioSourceFilterStep.High2]: "Heavy",
  [AudioSourceFilterStep.High1]: "Boosted",
  [AudioSourceFilterStep.Normal]: "Normal",
  [AudioSourceFilterStep.Low1]: "Unnamed",
  [AudioSourceFilterStep.Low2]: "Unnamed",
  [AudioSourceFilterStep.Low3]: "Unnamed",
};

export const audioSourceTrebleValues = {
  [AudioSourceFilterStep.High3]: 15,
  [AudioSourceFilterStep.High2]: 5,
  [AudioSourceFilterStep.High1]: 2.5,
  [AudioSourceFilterStep.Normal]: 0,
  [AudioSourceFilterStep.Low1]: 0,
  [AudioSourceFilterStep.Low2]: 0,
  [AudioSourceFilterStep.Low3]: 0,
};

export const audioSourceTrebleNames = {
  [AudioSourceFilterStep.High3]: "Wind up Radio",
  [AudioSourceFilterStep.High2]: "Tinny",
  [AudioSourceFilterStep.High1]: "Sharper",
  [AudioSourceFilterStep.Normal]: "Normal",
  [AudioSourceFilterStep.Low1]: "Unnamed",
  [AudioSourceFilterStep.Low2]: "Unnamed",
  [AudioSourceFilterStep.Low3]: "Unnamed",
};
