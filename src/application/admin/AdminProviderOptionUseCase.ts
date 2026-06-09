import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { revealProviderSecret } from "../../infrastructure/security/secureFields.js";
import type { ProviderRepository } from "../../infrastructure/storage/repositories/ProviderRepository.js";
import type { ProviderAdapter, ProviderCountryOption, ProviderPriceOption, ProviderResult, ProviderServiceOption } from "../../providers/index.js";

export type AdminProviderOptionUseCaseDependencies = {
  providers: ProviderRepository;
  providerAdapters: Map<string, ProviderAdapter>;
  securityKey: string;
};

export class AdminProviderOptionUseCase {
  constructor(private readonly dependencies: AdminProviderOptionUseCaseDependencies) {}

  async listCountries(providerId: string): Promise<ProviderCountryOption[]> {
    const { adapter, request } = this.prepare(providerId);
    if (!adapter.listCountries) {
      throw new SmsError(SmsErrorType.CapabilityNotSupported, "当前 Provider 不支持查询国家");
    }
    return this.unwrap(await adapter.listCountries(request));
  }

  async listServices(providerId: string): Promise<ProviderServiceOption[]> {
    const { adapter, request } = this.prepare(providerId);
    if (!adapter.listServices) {
      throw new SmsError(SmsErrorType.CapabilityNotSupported, "当前 Provider 不支持查询服务");
    }
    return this.unwrap(await adapter.listServices(request));
  }

  async listPrices(providerId: string, serviceCode: string | undefined, countryCode: string | undefined): Promise<ProviderPriceOption[]> {
    const { adapter, request } = this.prepare(providerId);
    if (!adapter.listPrices) {
      throw new SmsError(SmsErrorType.CapabilityNotSupported, "当前 Provider 不支持查询价格");
    }
    return this.unwrap(await adapter.listPrices({ ...request, serviceCode, countryCode }));
  }

  private prepare(providerId: string) {
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

    return {
      adapter,
      request: {
        providerId: provider.id,
        providerSecret: provider.secret_encrypted ? revealProviderSecret(provider.secret_encrypted, this.dependencies.securityKey) : undefined
      }
    };
  }

  private unwrap<T>(result: ProviderResult<T[]>): T[] {
    if (!result.ok) {
      throw new SmsError(result.errorType, result.message);
    }
    return result.data;
  }
}
