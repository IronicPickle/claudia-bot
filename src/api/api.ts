import config from "@config/config.ts";
import { ApiError } from "@shared/lib/ts/api/generic.ts";
import { GenericErrorCode } from "@shared/lib/enums/api.ts";
import ky, { KyResponse } from "ky";
import { encodeSessionJwt } from "@utils/api.ts";

const isKyError = (
  err: any
): err is {
  response: KyResponse;
} => !!err?.response?.json;

export const getErrorFromApiErr = async <K extends string | number | symbol>(
  err: any
): Promise<ApiError<K>> => {
  if (isKyError(err)) {
    try {
      const data = (await err.response.json()) as ApiError<K>;
      if (data) return data;
    } catch (_err: any) {}
  }

  return {
    error: err.message ?? err,
    errorCode: GenericErrorCode.KyError,
  } as ApiError<K>;
};

const injectJwt = async (req: Request) => {
  const currentJwt = req.headers.get("Authorization")?.replace("BEARER ", "");
  if (!currentJwt) {
    const newJwt = await encodeSessionJwt("internal");
    api.extend({
      headers: {
        Authorization: `BEARER ${newJwt}`,
      },
    });
    req.headers.set("Authorization", newJwt);
  }
};

export const api = ky.create({
  prefixUrl: config.internal.serverAddress,
  hooks: {
    beforeRequest: [injectJwt],
    beforeError: [
      (error) => {
        return error;
      },
    ],
    beforeRetry: [(options) => {}],
  },
});

export interface ApiCallRes<R> {
  error: ApiError<keyof R> | undefined;
  data: R | undefined;
}

export const apiCall = async <R>(func: () => Promise<R>) => {
  const res: ApiCallRes<R> = {
    data: undefined,
    error: undefined,
  };
  try {
    const data = await func();
    res.data = data;
  } catch (err: any) {
    const error = await getErrorFromApiErr(err);
    res.error = error;
  }

  return res;
};
