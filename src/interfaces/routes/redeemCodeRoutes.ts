import { Router } from "express";
import type { RedeemCodeUseCase } from "../../application/redeem-code/RedeemCodeUseCase.js";
import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createRedeemCodeRoutes(redeemCodeUseCase: RedeemCodeUseCase): Router {
  const router = Router();

  router.post("/redeem-codes/redeem", async (request, response, next) => {
    try {
      const code = typeof request.body?.code === "string" ? request.body.code : "";
      if (!code.trim()) {
        throw new SmsError(SmsErrorType.InvalidRedeemCode, "兑换码无效");
      }

      const data = await redeemCodeUseCase.execute({ code });
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
