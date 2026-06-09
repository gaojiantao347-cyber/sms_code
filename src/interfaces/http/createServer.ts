import path from "node:path";
import express from "express";
import type { AdminProviderOptionUseCase } from "../../application/admin/AdminProviderOptionUseCase.js";
import type { AdminProviderUseCase } from "../../application/admin/AdminProviderUseCase.js";
import type { AdminRedeemCodeUseCase } from "../../application/admin/AdminRedeemCodeUseCase.js";
import type { RedeemCodeUseCase } from "../../application/redeem-code/RedeemCodeUseCase.js";
import type { SmsTaskHistoryUseCase } from "../../application/sms-task/SmsTaskHistoryUseCase.js";
import type { SmsTaskUseCase } from "../../application/sms-task/SmsTaskUseCase.js";
import { createAdminOptionRoutes } from "../routes/adminOptionRoutes.js";
import { createAdminProviderRoutes } from "../routes/adminProviderRoutes.js";
import { createAdminRedeemCodeRoutes } from "../routes/adminRedeemCodeRoutes.js";
import { createHealthRoutes } from "../routes/healthRoutes.js";
import { createRedeemCodeRoutes } from "../routes/redeemCodeRoutes.js";
import { createSmsTaskHistoryRoutes } from "../routes/smsTaskHistoryRoutes.js";
import { createSmsTaskRoutes } from "../routes/smsTaskRoutes.js";
import { createAdminAuthMiddleware } from "./adminAuthMiddleware.js";
import { errorMiddleware, notFoundHandler } from "./errorMiddleware.js";
import { requestIdMiddleware } from "./requestIdMiddleware.js";

export type ServerDependencies = {
  redeemCodeUseCase: RedeemCodeUseCase;
  smsTaskUseCase: SmsTaskUseCase;
  smsTaskHistoryUseCase: SmsTaskHistoryUseCase;
  adminRedeemCodeUseCase: AdminRedeemCodeUseCase;
  adminProviderUseCase: AdminProviderUseCase;
  adminProviderOptionUseCase: AdminProviderOptionUseCase;
  adminToken: string;
};

export function createServer(dependencies: ServerDependencies): express.Express {
  const app = express();

  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use("/api/v2", createHealthRoutes());
  app.use("/api/v2", createRedeemCodeRoutes(dependencies.redeemCodeUseCase));
  app.use("/api/v2", createSmsTaskRoutes(dependencies.smsTaskUseCase));
  app.use("/api/v2", createSmsTaskHistoryRoutes(dependencies.smsTaskHistoryUseCase));
  app.use("/api/v2", createAdminAuthMiddleware(dependencies.adminToken));
  app.use("/api/v2", createAdminOptionRoutes(dependencies.adminProviderOptionUseCase));
  app.use("/api/v2", createAdminRedeemCodeRoutes(dependencies.adminRedeemCodeUseCase));
  app.use("/api/v2", createAdminProviderRoutes(dependencies.adminProviderUseCase));

  if (process.env.NODE_ENV === "production") {
    const webRoot = path.resolve(process.cwd(), "dist-web");
    app.use(express.static(webRoot));
    app.get(/^\/(?!api\/).*/, (_request, response) => {
      response.sendFile(path.join(webRoot, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
