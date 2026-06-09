import { httpClient } from "./httpClient";
import type { RedeemCodeRequest, RedeemCodeResult } from "../types/redeem";

export const redeemService = {
  redeem(code: string) {
    const body: RedeemCodeRequest = { code };
    return httpClient<RedeemCodeResult>("/redeem-codes/redeem", { method: "POST", body });
  }
};
