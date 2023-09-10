import { isUint8Array } from "https://deno.land/std@0.83.0/node/_util/_util_types.ts";
import { isDev } from "../../config/config.ts";
import { CommandOption, CommandOptions, CommandValue } from "../ts/generic.ts";

export const log = (...text: any[]) => isDev && console.log("[Dev]", ...text);

export const logError = (...text: any[]) =>
  isDev && console.error("[Dev]", "[ERROR]", ...text);

export const isUint8Arr = (value: any): value is Uint8Array =>
  isUint8Array(value);

export const parseCommandOptions = <P extends Record<string, CommandValue>>(
  options: CommandOptions = []
) => {
  type ParsedOption = CommandOption & {
    value: P[keyof P];
  };
  const parsedOptions = {} as Record<keyof P, ParsedOption>;

  for (const option of options) {
    parsedOptions[option.name as keyof P] = option as ParsedOption;
  }

  return parsedOptions;
};

export const parseTime = (timeElapsed: number, includeDays?: boolean) => {
  const isNegative = timeElapsed < 0;
  if (isNegative) timeElapsed = Math.abs(timeElapsed);
  if (timeElapsed <= 0) timeElapsed = 0;
  let days = 0;
  if (includeDays) {
    days = Math.floor(timeElapsed / 86400);
    timeElapsed -= days * 86400;
  }
  const hours = Math.floor(timeElapsed / 3600);
  timeElapsed -= hours * 3600;
  const minutes = Math.floor(timeElapsed / 60);
  timeElapsed -= minutes * 60;
  const seconds = timeElapsed;

  const padNumber = (number: number) => {
    return number.toString().padStart(2, "0");
  };

  return {
    days,
    hours,
    minutes,
    seconds,
    daysPadded: padNumber(days),
    hoursPadded: padNumber(hours),
    minutesPadded: padNumber(minutes),
    secondsPadded: padNumber(seconds),
    isNegative,
  };
};

export const createUserAt = (id: bigint) => `<@${id}>`;

export const joinMultilines = (lines: string[]) => lines.join("\n");
