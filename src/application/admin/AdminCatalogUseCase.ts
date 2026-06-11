import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { revealProviderSecret } from "../../infrastructure/security/secureFields.js";
import type { CatalogRepository } from "../../infrastructure/storage/repositories/CatalogRepository.js";
import type { ProviderRepository } from "../../infrastructure/storage/repositories/ProviderRepository.js";
import type { ProviderAdapter } from "../../providers/index.js";

export type AdminCatalogUseCaseDependencies = {
  catalog: CatalogRepository;
  providers: ProviderRepository;
  providerAdapters: Map<string, ProviderAdapter>;
  securityKey: string;
};

export type CatalogEntryOutput = {
  code: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CatalogSyncOutput = {
  platforms: number;
  countries: number;
};

export class AdminCatalogUseCase {
  constructor(private readonly dependencies: AdminCatalogUseCaseDependencies) {}

  listPlatforms(enabledOnly: boolean): CatalogEntryOutput[] {
    return this.dependencies.catalog.listPlatforms(enabledOnly ? { enabled: true } : {}).map(toOutput);
  }

  listCountries(enabledOnly: boolean): CatalogEntryOutput[] {
    return this.dependencies.catalog.listCountries(enabledOnly ? { enabled: true } : {}).map(toOutput);
  }

  async sync(providerId: string): Promise<CatalogSyncOutput> {
    const provider = this.dependencies.providers.findById(providerId.trim());
    if (!provider) {
      throw new SmsError(SmsErrorType.ProviderNotConfigured, "Provider 不存在", 404);
    }
    if (provider.enabled !== 1) {
      throw new SmsError(SmsErrorType.ProviderUnavailable, "Provider 已禁用");
    }

    const adapter = this.dependencies.providerAdapters.get(provider.name);
    if (!adapter) {
      throw new SmsError(SmsErrorType.ProviderUnavailable, "接码服务暂不可用");
    }
    if (!adapter.listServices || !adapter.listCountries) {
      throw new SmsError(SmsErrorType.CapabilityNotSupported, "当前 Provider 不支持同步目录");
    }

    const secret = provider.secret_encrypted ? revealProviderSecret(provider.secret_encrypted, this.dependencies.securityKey) : undefined;
    const request = { providerId: provider.id, providerSecret: secret };

    const servicesResult = await adapter.listServices(request);
    if (!servicesResult.ok) {
      throw new SmsError(servicesResult.errorType, servicesResult.message);
    }
    const countriesResult = await adapter.listCountries(request);
    if (!countriesResult.ok) {
      throw new SmsError(countriesResult.errorType, countriesResult.message);
    }

    return {
      platforms: this.dependencies.catalog.upsertPlatforms(servicesResult.data),
      countries: this.dependencies.catalog.upsertCountries(countriesResult.data)
    };
  }
}

function toOutput(record: { code: string; name: string; enabled: number; created_at: string; updated_at: string }): CatalogEntryOutput {
  return {
    code: record.code,
    name: record.name,
    enabled: record.enabled === 1,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}
