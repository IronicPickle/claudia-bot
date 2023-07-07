import { isUint8Array } from "https://deno.land/std@0.83.0/node/_util/_util_types.ts";
import { isDev } from "../../config/config.ts";
import { WebhookPingEvent } from "../ts/webhookPingEvent.ts";
import { WebhookPushEvent } from "../ts/webhookPushEvent.ts";

export const log = (...text: any[]) => isDev && console.log("[Dev]", ...text);

export const parseId = (id?: string | number | bigint | boolean) =>
  id ? BigInt(id) : null;

export const isWebhookPingEvent = (
  webhookEvent: any
): webhookEvent is WebhookPingEvent => !!webhookEvent?.zen;

export const isWebhookPushEvent = (
  webhookEvent: any
): webhookEvent is WebhookPushEvent => !webhookEvent?.zen;

export const toCamelCase = (text: string) => {
  const array = text.toLowerCase().split(/-|_/g);
  const uppered = array.map((word, i) =>
    i === 0 ? word : `${word[0].toUpperCase()}${word.slice(1)}`
  );
  const cameled = uppered.join("");

  return cameled;
};
export const getNestedValue = (object: Record<any, any>, key: string): any => {
  return key.split(".").reduce((acc, k) => (acc && acc[k]) ?? null, object);
};

export const isNumber = (value: any): value is number =>
  typeof value === "number" && !isNaN(value);
export const isString = (value: any): value is string =>
  typeof value === "string";
export const isBoolean = (value: any): value is boolean =>
  typeof value === "boolean";

export const isUint8Arr = (value: any): value is Uint8Array =>
  isUint8Array(value);

export const sleep = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms));
