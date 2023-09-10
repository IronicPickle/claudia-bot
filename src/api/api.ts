import config from "../config/config.ts";
import { ApiError } from "../../../claudia-shared/lib/ts/api/generic.ts";
import { GenericErrorCode } from "../../../claudia-shared/lib/enums/api.ts";
import ky, { KyResponse } from "https://esm.sh/ky@0.33.3";
export * from "https://esm.sh/ky@0.33.3";

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

export const api = ky.create({
  prefixUrl: config.internal.serverAddress,
  hooks: {
    beforeRequest: [(req, options) => {}],
    beforeError: [
      (error) => {
        return error;
      },
    ],
    beforeRetry: [(options) => {}],
  },
});

export const apiCall = async <R>(func: () => Promise<R>) => {
  const res: { error: ApiError<keyof R> | undefined; data: R | undefined } = {
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
