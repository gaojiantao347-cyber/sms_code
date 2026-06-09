import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { ProviderCapability } from "../../domain/provider/ProviderCapability.js";
import { secureProviderSecret } from "../../infrastructure/security/secureFields.js";
import type { ProviderListFilter, ProviderRepository } from "../../infrastructure/storage/repositories/ProviderRepository.js";
import type { ProviderCapabilityRecord, ProviderConfigRecord } from "../../infrastructure/storage/types.js";

export type AdminProviderListInput = {
  nameKeyword?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminProviderCapabilityInput = {
  capabilityCode: ProviderCapability;
  enabled: boolean;
};

export type AdminProviderCreateInput = {
  name: string;
  enabled?: boolean;
  secret?: string | null;
  defaultServiceCode?: string | null;
  defaultCountryCode?: string | null;
  capabilities?: AdminProviderCapabilityInput[];
};

export type AdminProviderUpdateInput = Partial<AdminProviderCreateInput>;

export type AdminProviderOutput = {
  id: string;
  name: string;
  enabled: boolean;
  secretConfigured: boolean;
  secretMasked: string | null;
  defaultServiceCode: string | null;
  defaultCountryCode: string | null;
  capabilities: Array<{ capabilityCode: ProviderCapability; enabled: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export type AdminProviderListOutput = {
  items: AdminProviderOutput[];
  page: number;
  pageSize: number;
  total: number;
};

export class AdminProviderUseCase {
  constructor(
    private readonly providers: ProviderRepository,
    private readonly securityKey: string
  ) {}

  list(input: AdminProviderListInput): AdminProviderListOutput {
    const filter = this.toFilter(input);
    return {
      items: this.providers.list(filter).map((provider) => this.toOutput(provider)),
      page: filter.page,
      pageSize: filter.pageSize,
      total: this.providers.count(filter)
    };
  }

  create(input: AdminProviderCreateInput): AdminProviderOutput {
    const secret = input.secret?.trim();
    const securedSecret = secret ? secureProviderSecret(secret, this.securityKey) : undefined;
    const provider = this.providers.create({
      name: requireText(input.name, "Provider 名称不能为空"),
      enabled: input.enabled,
      secretEncrypted: securedSecret?.secretEncrypted,
      secretMasked: securedSecret?.secretMasked,
      defaultServiceCode: normalizeNullable(input.defaultServiceCode),
      defaultCountryCode: normalizeNullable(input.defaultCountryCode),
      capabilities: normalizeCapabilities(input.capabilities)
    });

    return this.toOutput(provider);
  }

  update(id: string, input: AdminProviderUpdateInput): AdminProviderOutput {
    const existing = this.providers.findById(id);
    if (!existing) {
      throw new SmsError(SmsErrorType.ProviderNotConfigured, "Provider 不存在", 404);
    }

    const secret = input.secret?.trim();
    const securedSecret = secret ? secureProviderSecret(secret, this.securityKey) : undefined;
    const updated = this.providers.update(id, {
      name: input.name === undefined ? undefined : requireText(input.name, "Provider 名称不能为空"),
      enabled: input.enabled,
      secretEncrypted: securedSecret?.secretEncrypted,
      secretMasked: securedSecret?.secretMasked,
      defaultServiceCode: input.defaultServiceCode === undefined ? undefined : normalizeNullable(input.defaultServiceCode),
      defaultCountryCode: input.defaultCountryCode === undefined ? undefined : normalizeNullable(input.defaultCountryCode)
    });
    if (!updated) {
      throw new SmsError(SmsErrorType.InternalError, "Provider 更新失败", 500);
    }
    if (input.capabilities !== undefined) {
      this.providers.replaceCapabilities(id, normalizeCapabilities(input.capabilities));
    }

    return this.toOutput(this.providers.findById(id)!);
  }

  disable(id: string): AdminProviderOutput {
    return this.update(id, { enabled: false });
  }

  private toFilter(input: AdminProviderListInput): ProviderListFilter {
    return {
      nameKeyword: input.nameKeyword?.trim() || undefined,
      enabled: input.enabled,
      page: normalizePositiveInteger(input.page, 1, 1, 1000000),
      pageSize: normalizePositiveInteger(input.pageSize, 20, 1, 100)
    };
  }

  private toOutput(provider: ProviderConfigRecord): AdminProviderOutput {
    return {
      id: provider.id,
      name: provider.name,
      enabled: provider.enabled === 1,
      secretConfigured: Boolean(provider.secret_encrypted),
      secretMasked: provider.secret_masked,
      defaultServiceCode: provider.default_service_code,
      defaultCountryCode: provider.default_country_code,
      capabilities: this.providers.listCapabilities(provider.id).map(toCapabilityOutput),
      createdAt: provider.created_at,
      updatedAt: provider.updated_at
    };
  }
}

function toCapabilityOutput(record: ProviderCapabilityRecord): { capabilityCode: ProviderCapability; enabled: boolean } {
  return {
    capabilityCode: record.capability_code,
    enabled: record.enabled === 1
  };
}

function requireText(value: string, message: string): string {
  const text = value.trim();
  if (!text) {
    throw new SmsError(SmsErrorType.ProviderNotConfigured, message);
  }

  return text;
}

function normalizeCapabilities(value: AdminProviderCapabilityInput[] | undefined): AdminProviderCapabilityInput[] {
  return (value ?? []).map((capability) => {
    if (!Object.values(ProviderCapability).includes(capability.capabilityCode)) {
      throw new SmsError(SmsErrorType.CapabilityNotSupported, "Provider 能力无效");
    }
    return {
      capabilityCode: capability.capabilityCode,
      enabled: capability.enabled === true
    };
  });
}

function normalizePositiveInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isInteger(value) || value < min) {
    return fallback;
  }
  return Math.min(value, max);
}

function normalizeNullable(value: string | null | undefined): string | null {
  return value?.trim() || null;
}
