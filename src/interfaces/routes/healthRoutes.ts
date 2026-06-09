import { Router } from "express";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createHealthRoutes(): Router {
  const router = Router();

  router.get("/health", (request, response) => {
    response.json(
      successResponse(
        {
          status: "ok",
          service: "sms-code-v2"
        },
        getRequestId(request as RequestWithId)
      )
    );
  });

  return router;
}
