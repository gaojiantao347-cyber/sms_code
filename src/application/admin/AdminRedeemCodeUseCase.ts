import { randomBytes } from "node:crypto";
import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { SmsMode } from "../../domain/sms-task/SmsMode.js";
import { revealRedeemCode, secureRedeemCode } from "../../infrastructure/security/secureFields.js";
import type { RedeemCodeListFilter, RedeemCodeRepository } from "../../infrastructure/storage/repositories/RedeemCodeRepository.js";
import type { RedeemCodeRecord } from "../../infrastructure/storage/types.js";

export type AdminRedeemCodeListInput = {
  codeKeyword?: string;
  platformCode?: string;
  smsMode?: SmsMode;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminRedeemCodeCreateInput = {
  enabled?: boolean;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
  countryCode: string;
  maxUseCount: number;
  expiresAt?: string | null;
};

export type AdminRedeemCodeUpdateInput = Partial<AdminRedeemCodeCreateInput>;

export type AdminRedeemCodeOutput = {
  id: string;
  code: string | null;
  codeMasked: string;
  enabled: boolean;
  platform: { code: string; name: string };
  smsMode: SmsMode;
  countryCode: string;
  maxUseCount: number;
  usedCount: number;
  expiresAt: string | null;
  currentTaskId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminRedeemCodeCreateOutput = AdminRedeemCodeOutput & {
  code: string;
};

export type AdminRedeemCodeListOutput = {
  items: AdminRedeemCodeOutput[];
  page: number;
  pageSize: number;
  total: number;
};

export class AdminRedeemCodeUseCase {
  constructor(
    private readonly redeemCodes: RedeemCodeRepository,
    private readonly securityKey: string
  ) {}

  list(input: AdminRedeemCodeListInput): AdminRedeemCodeListOutput {
    const filter = this.toFilter(input);
    return {
      items: this.redeemCodes.list(filter).map((record) => toOutput(record, this.securityKey)),
      page: filter.page,
      pageSize: filter.pageSize,
      total: this.redeemCodes.count(filter)
    };
  }

  create(input: AdminRedeemCodeCreateInput): AdminRedeemCodeCreateOutput {
    const code = generateRedeemCode();
    const record = this.redeemCodes.create({
      ...secureRedeemCode(code, this.securityKey),
      enabled: input.enabled,
      platformCode: requireText(input.platformCode, SmsErrorType.PlatformNotConfigured, "平台编码不能为空"),
      platformName: requireText(input.platformName, SmsErrorType.PlatformNotConfigured, "平台名称不能为空"),
      smsMode: requireSmsMode(input.smsMode),
      countryCode: requireText(input.countryCode, SmsErrorType.PlatformNotConfigured, "国家或地区不能为空"),
      maxUseCount: requirePositiveInteger(input.maxUseCount, "最大使用次数无效"),
      expiresAt: normalizeNullable(input.expiresAt)
    });
    return { ...toOutput(record, this.securityKey), code };
  }

  update(id: string, input: AdminRedeemCodeUpdateInput): AdminRedeemCodeOutput {
    const existing = this.redeemCodes.findById(id);
    if (!existing) {
      throw new SmsError(SmsErrorType.InvalidRedeemCode, "兑换码不存在", 404);
    }

    const updated = this.redeemCodes.update(id, {
      enabled: input.enabled,
      platformCode: input.platformCode === undefined ? undefined : requireText(input.platformCode, SmsErrorType.PlatformNotConfigured, "平台编码不能为空"),
      platformName: input.platformName === undefined ? undefined : requireText(input.platformName, SmsErrorType.PlatformNotConfigured, "平台名称不能为空"),
      smsMode: input.smsMode === undefined ? undefined : requireSmsMode(input.smsMode),
      countryCode: input.countryCode === undefined ? undefined : requireText(input.countryCode, SmsErrorType.PlatformNotConfigured, "国家或地区不能为空"),
      maxUseCount: input.maxUseCount === undefined ? undefined : requirePositiveInteger(input.maxUseCount, "最大使用次数无效"),
      expiresAt: input.expiresAt === undefined ? undefined : normalizeNullable(input.expiresAt)
    });
    if (!updated) {
      throw new SmsError(SmsErrorType.InternalError, "兑换码更新失败", 500);
    }

    return toOutput(this.redeemCodes.findById(id)!, this.securityKey);
  }

  disable(id: string): AdminRedeemCodeOutput {
    return this.update(id, { enabled: false });
  }

  private toFilter(input: AdminRedeemCodeListInput): RedeemCodeListFilter {
    return {
      codeKeyword: input.codeKeyword?.trim() || undefined,
      platformCode: input.platformCode?.trim() || undefined,
      smsMode: input.smsMode,
      enabled: input.enabled,
      page: normalizePositiveInteger(input.page, 1, 1, 1000000),
      pageSize: normalizePositiveInteger(input.pageSize, 20, 1, 100)
    };
  }
}

function generateRedeemCode(): string {
  const text = randomBytes(12).toString("base64url").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 16);
  return text.match(/.{1,4}/g)?.join("-") ?? text;
}

function toOutput(record: RedeemCodeRecord, securityKey: string): AdminRedeemCodeOutput {
  return {
    id: record.id,
    code: record.code_encrypted ? revealRedeemCode(record.code_encrypted, securityKey) : null,
    codeMasked: record.code_masked,
    enabled: record.enabled === 1,
    platform: { code: record.platform_code, name: record.platform_name },
    smsMode: record.sms_mode,
    countryCode: record.country_code,
    maxUseCount: record.max_use_count,
    usedCount: record.used_count,
    expiresAt: record.expires_at,
    currentTaskId: record.current_task_id,
    lastUsedAt: record.last_used_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function requireText(value: string, type: SmsErrorType, message: string): string {
  const text = value.trim();
  if (!text) {
    throw new SmsError(type, message);
  }

  return text;
}

function requireSmsMode(value: SmsMode): SmsMode {
  if (value !== SmsMode.ShortTerm && value !== SmsMode.LongTerm) {
    throw new SmsError(SmsErrorType.SmsModeNotConfigured, "接码类型无效");
  }

  return value;
}

function requirePositiveInteger(value: number, message: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SmsError(SmsErrorType.InvalidRedeemCode, message);
  }

  return value;
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
