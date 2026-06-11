import { AdminCatalogUseCase } from "./application/admin/AdminCatalogUseCase.js";
import { AdminProviderOptionUseCase } from "./application/admin/AdminProviderOptionUseCase.js";
import { AdminProviderUseCase } from "./application/admin/AdminProviderUseCase.js";
import { AdminRedeemCodeUseCase } from "./application/admin/AdminRedeemCodeUseCase.js";
import { RedeemCodeUseCase } from "./application/redeem-code/RedeemCodeUseCase.js";
import { SmsTaskHistoryUseCase } from "./application/sms-task/SmsTaskHistoryUseCase.js";
import { SmsTaskUseCase } from "./application/sms-task/SmsTaskUseCase.js";
import { loadConfig } from "./infrastructure/config/config.js";
import { logger } from "./infrastructure/logger/logger.js";
import { createDatabase } from "./infrastructure/storage/database.js";
import { CatalogRepository } from "./infrastructure/storage/repositories/CatalogRepository.js";
import { ProviderRepository } from "./infrastructure/storage/repositories/ProviderRepository.js";
import { RedeemCodeRepository } from "./infrastructure/storage/repositories/RedeemCodeRepository.js";
import { SmsTaskRepository } from "./infrastructure/storage/repositories/SmsTaskRepository.js";
import { createServer } from "./interfaces/http/createServer.js";
import { HeroSmsProviderAdapter, MockProviderAdapter, type ProviderAdapter } from "./providers/index.js";
import { SmsCodeScheduler } from "./scheduler/SmsCodeScheduler.js";

const config = loadConfig();
const database = createDatabase(config.databasePath);
const redeemCodes = new RedeemCodeRepository(database);
const providers = new ProviderRepository(database);
const smsTasks = new SmsTaskRepository(database);
const catalog = new CatalogRepository(database);
const heroSmsProvider = new HeroSmsProviderAdapter();
const mockProvider = new MockProviderAdapter();
const providerAdapters = new Map<string, ProviderAdapter>([
  [heroSmsProvider.providerCode, heroSmsProvider],
  [mockProvider.providerCode, mockProvider]
]);
const redeemCodeUseCase = new RedeemCodeUseCase({
  redeemCodes,
  providers,
  smsTasks,
  providerAdapters,
  securityKey: config.securityKey
});
const smsCodeScheduler = new SmsCodeScheduler({
  smsTasks,
  providers,
  providerAdapters,
  securityKey: config.securityKey
});
const smsTaskUseCase = new SmsTaskUseCase({
  smsTasks,
  securityKey: config.securityKey,
  scheduler: smsCodeScheduler
});
const smsTaskHistoryUseCase = new SmsTaskHistoryUseCase({ smsTasks });
const adminRedeemCodeUseCase = new AdminRedeemCodeUseCase(redeemCodes, config.securityKey);
const adminProviderUseCase = new AdminProviderUseCase(providers, config.securityKey);
const adminProviderOptionUseCase = new AdminProviderOptionUseCase({
  providers,
  providerAdapters,
  securityKey: config.securityKey
});
const adminCatalogUseCase = new AdminCatalogUseCase({
  catalog,
  providers,
  providerAdapters,
  securityKey: config.securityKey
});
const app = createServer({
  redeemCodeUseCase,
  smsTaskUseCase,
  smsTaskHistoryUseCase,
  adminRedeemCodeUseCase,
  adminProviderUseCase,
  adminProviderOptionUseCase,
  adminCatalogUseCase,
  adminToken: config.adminToken
});

app.listen(config.port, () => {
  smsCodeScheduler.start();
  logger.info("SMS code service started", {
    port: config.port,
    nodeEnv: config.nodeEnv
  });
});
