import config from "@config/config.ts";
import dayjs from "dayjs";
import { create, verify } from "djwt";

const jwtKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(config.authSecret),
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

export const encodeJwt = (
  id: "internal" | string,
  expiry: number,
  payload?: Record<any, any>
) =>
  create(
    {
      alg: "HS512",
      typ: "JWT",
    },
    {
      sub: id,
      nbf: dayjs().unix(),
      iat: dayjs().unix(),
      exp: dayjs().add(expiry, "ms").unix(),
      ...payload,
    },
    jwtKey
  );

const ONE_HOUR_MS = 1000 * 60 * 60;

const SESSION_EXPIRY_MS = ONE_HOUR_MS * 1;
const REFRESH_EXPIRY_MS = ONE_HOUR_MS * 1;

export const encodeSessionJwt = (
  id: "internal" | string,
  payload?: Record<any, any>
) => encodeJwt(id, SESSION_EXPIRY_MS, payload);

export const encodeRefreshJwt = (
  id: "internal" | string,
  payload?: Record<any, any>
) => encodeJwt(id, REFRESH_EXPIRY_MS, payload);

export const decodeJwt = async (jwt: string) => {
  try {
    return await verify(jwt, jwtKey);
  } catch (_err) {
    return null;
  }
};
