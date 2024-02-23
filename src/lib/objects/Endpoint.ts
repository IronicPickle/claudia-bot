import Validator from "@shared/lib/objects/Validator.ts";
import {
  ApiCallRes,
  RequestDetails,
  RequestInputs,
  RequestResponse,
  ValidatorInputs,
} from "@shared/lib/ts/api/generic.ts";
import { apiCall } from "@api/api.ts";

type InputCall<RD extends RequestDetails> = (
  requestInputs: RequestInputs<RD>
) => Promise<RequestResponse<RD>>;
type Call<RD extends RequestDetails> = (
  requestInputs: RequestInputs<RD>
) => Promise<ApiCallRes<RD>>;
type Validators<RD extends RequestDetails> = (
  inputs: ValidatorInputs<RD>
) => Record<keyof ValidatorInputs<RD>, Validator>;

export default class Endpoint<RD extends RequestDetails> {
  public call: Call<RD>;
  public getValidators?: Validators<RD>;

  constructor(call: InputCall<RD>, getValidators?: Validators<RD>) {
    this.call = (requestInputs: RequestInputs<RD>) =>
      apiCall<RD>(() => call(requestInputs));
    this.getValidators = getValidators;
  }
}
