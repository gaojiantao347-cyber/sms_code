import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { ProviderCapability } from "../../domain/provider/ProviderCapability.js";
import { SmsMode } from "../../domain/sms-task/SmsMode.js";
import { SmsTaskStatus } from "../../domain/sms-task/SmsTaskStatus.js";
import { ProviderRepository } from "../../infrastructure/storage/repositories/ProviderRepository.js";
import { RedeemCodeRepository } from "../../infrastructure/storage/repositories/RedeemCodeRepository.js";
import { SmsTaskRepository } from "../../infrastructure/storage/repositories/SmsTaskRepository.js";
import { hashRedeemCode, revealProviderSecret, securePhoneNumber } from "../../infrastructure/security/secureFields.js";
import type { ProviderAdapter } from "../../providers/index.js";

export type RedeemCodeUseCaseInput = {
  code: string;
};

export type RedeemCodeUseCaseOutput = {
  taskId: string;
  phoneNumber: string;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
};

export type RedeemCodeUseCaseDependencies = {
  redeemCodes: RedeemCodeRepository;
  providers: ProviderRepository;
  smsTasks: SmsTaskRepository;
  providerAdapters: Map<string, ProviderAdapter>;
  securityKey: string;
};

export class RedeemCodeUseCase {
  constructor(private readonly dependencies: RedeemCodeUseCaseDependencies) {}

  async execute(input: RedeemCodeUseCaseInput): Promise<RedeemCodeUseCaseOutput> {
    const code = input.code.trim();
    if (!code) {
      throw new SmsError(SmsErrorType.InvalidRedeemCode, "兑换码无效");
    }

    const redeemCode = this.dependencies.redeemCodes.findByCodeHash(hashRedeemCode(code));
    if (!redeemCode) {
      throw new SmsError(SmsErrorType.InvalidRedeemCode, "兑换码无效");
    }

    if (redeemCode.enabled !== 1) {
      throw new SmsError(SmsErrorType.RedeemCodeDisabled, "兑换码已被禁用");
    }

    if (redeemCode.expires_at && redeemCode.expires_at <= new Date().toISOString()) {
      throw new SmsError(SmsErrorType.RedeemCodeExpired, "兑换码已过期");
    }

    if (redeemCode.used_count >= redeemCode.max_use_count) {
      throw new SmsError(SmsErrorType.RedeemCodeUsedUp, "兑换码已使用完");
    }

    if (redeemCode.current_task_id) {
      throw new SmsError(SmsErrorType.RedeemCodeInUse, "该兑换码已有进行中的任务");
    }

    if (!redeemCode.platform_code || !redeemCode.platform_name) {
      throw new SmsError(SmsErrorType.PlatformNotConfigured, "兑换码未配置目标平台");
    }

    if (redeemCode.sms_mode !== SmsMode.ShortTerm && redeemCode.sms_mode !== SmsMode.LongTerm) {
      throw new SmsError(SmsErrorType.SmsModeNotConfigured, "兑换码未配置接码类型");
    }

    const provider = this.dependencies.providers.findById(redeemCode.provider_id);
    if (!provider) {
      throw new SmsError(SmsErrorType.ProviderNotConfigured, "接码服务未配置");
    }

    if (provider.enabled !== 1) {
      throw new SmsError(SmsErrorType.ProviderUnavailable, "接码服务暂不可用");
    }

    const requiredCapability = redeemCode.sms_mode === SmsMode.ShortTerm ? ProviderCapability.ShortTermRental : ProviderCapability.LongTermRental;
    const capabilities = this.dependencies.providers.listCapabilities(provider.id);
    const supportsMode = capabilities.some((capability) => capability.enabled === 1 && capability.capability_code === requiredCapability);
    const supportsWaitCode = capabilities.some((capability) => capability.enabled === 1 && capability.capability_code === ProviderCapability.WaitCode);
    if (!supportsMode || !supportsWaitCode) {
      throw new SmsError(SmsErrorType.CapabilityNotSupported, "当前接码类型暂不支持");
    }

    const adapter = this.dependencies.providerAdapters.get(provider.name);
    if (!adapter) {
      throw new SmsError(SmsErrorType.ProviderUnavailable, "接码服务暂不可用");
    }

    const task = this.dependencies.smsTasks.create({
      redeemCodeId: redeemCode.id,
      providerId: provider.id,
      platformCode: redeemCode.platform_code,
      platformName: redeemCode.platform_name,
      smsMode: redeemCode.sms_mode,
      status: SmsTaskStatus.CodeValidated
    });

    const occupied = this.dependencies.redeemCodes.occupy(redeemCode.id, task.id, redeemCode.version);
    if (!occupied) {
      this.dependencies.smsTasks.update(task.id, {
        status: SmsTaskStatus.Failed,
        errorType: SmsErrorType.RedeemCodeInUse,
        errorMessage: "该兑换码已有进行中的任务",
        finishedAt: new Date().toISOString()
      });
      this.dependencies.smsTasks.createStatusLog({
        taskId: task.id,
        fromStatus: SmsTaskStatus.CodeValidated,
        toStatus: SmsTaskStatus.Failed,
        errorType: SmsErrorType.RedeemCodeInUse,
        message: "该兑换码已有进行中的任务"
      });
      throw new SmsError(SmsErrorType.RedeemCodeInUse, "该兑换码已有进行中的任务");
    }

    this.dependencies.smsTasks.updateStatus(task.id, SmsTaskStatus.CodeValidated, SmsTaskStatus.NumberAcquiring, task.version);

    const providerResult = await this.acquireNumber(adapter, {
      providerId: provider.id,
      providerSecret: provider.secret_encrypted ? revealProviderSecret(provider.secret_encrypted, this.dependencies.securityKey) : undefined,
      serviceCode: redeemCode.service_code ?? provider.default_service_code ?? undefined,
      countryCode: redeemCode.country_code ?? provider.default_country_code ?? undefined,
      operator: redeemCode.operator ?? undefined,
      maxPrice: redeemCode.max_price ?? undefined
    }, redeemCode.sms_mode);

    if (!providerResult.ok) {
      this.dependencies.redeemCodes.release(redeemCode.id);
      this.dependencies.smsTasks.update(task.id, {
        status: SmsTaskStatus.Failed,
        errorType: providerResult.errorType,
        errorMessage: providerResult.message,
        finishedAt: new Date().toISOString()
      });
      this.dependencies.smsTasks.createStatusLog({
        taskId: task.id,
        fromStatus: SmsTaskStatus.NumberAcquiring,
        toStatus: SmsTaskStatus.Failed,
        errorType: providerResult.errorType,
        message: providerResult.message
      });
      throw new SmsError(providerResult.errorType, providerResult.message);
    }

    const phone = securePhoneNumber(providerResult.data.phoneNumber, this.dependencies.securityKey);
    this.dependencies.smsTasks.update(task.id, {
      providerOrderId: providerResult.data.providerOrderId,
      phoneNumberEncrypted: phone.phoneNumberEncrypted,
      phoneNumberMasked: phone.phoneNumberMasked,
      status: SmsTaskStatus.NumberAcquired
    });
    this.dependencies.smsTasks.createStatusLog({
      taskId: task.id,
      fromStatus: SmsTaskStatus.NumberAcquiring,
      toStatus: SmsTaskStatus.NumberAcquired
    });
    this.dependencies.redeemCodes.incrementUsedCount(redeemCode.id);

    return {
      taskId: task.id,
      phoneNumber: providerResult.data.phoneNumber,
      platformCode: redeemCode.platform_code,
      platformName: redeemCode.platform_name,
      smsMode: redeemCode.sms_mode
    };
  }

  private acquireNumber(
    adapter: ProviderAdapter,
    request: Parameters<ProviderAdapter["acquireShortTermNumber"]>[0],
    smsMode: SmsMode
  ) {
    return smsMode === SmsMode.ShortTerm ? adapter.acquireShortTermNumber(request) : adapter.acquireLongTermNumber(request);
  }
}
