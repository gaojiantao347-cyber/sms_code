import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { SmsMode } from "../../domain/sms-task/SmsMode.js";
import { SmsTaskStatus } from "../../domain/sms-task/SmsTaskStatus.js";
import { logger } from "../../infrastructure/logger/logger.js";
import { ProviderRepository } from "../../infrastructure/storage/repositories/ProviderRepository.js";
import { RedeemCodeRepository } from "../../infrastructure/storage/repositories/RedeemCodeRepository.js";
import { SmsTaskRepository } from "../../infrastructure/storage/repositories/SmsTaskRepository.js";
import type { ProviderConfigRecord } from "../../infrastructure/storage/types.js";
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

type PricedCandidate = {
  provider: ProviderConfigRecord;
  adapter: ProviderAdapter;
  secret: string | undefined;
  price: number | null;
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

    if (!redeemCode.country_code) {
      throw new SmsError(SmsErrorType.PlatformNotConfigured, "兑换码未配置国家或地区");
    }

    if (redeemCode.sms_mode !== SmsMode.ShortTerm && redeemCode.sms_mode !== SmsMode.LongTerm) {
      throw new SmsError(SmsErrorType.SmsModeNotConfigured, "兑换码未配置接码类型");
    }

    const candidates = await this.buildCandidates(redeemCode.sms_mode, redeemCode.platform_code, redeemCode.country_code);
    if (candidates.length === 0) {
      throw new SmsError(SmsErrorType.ProviderUnavailable, "当前接码类型暂无可用接码服务");
    }

    const task = this.dependencies.smsTasks.create({
      redeemCodeId: redeemCode.id,
      providerId: candidates[0].provider.id,
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

    const acquired = await this.acquireFromCandidates(task.id, candidates, redeemCode.platform_code, redeemCode.country_code, redeemCode.sms_mode);

    if (!acquired) {
      this.dependencies.redeemCodes.release(redeemCode.id);
      this.dependencies.smsTasks.update(task.id, {
        status: SmsTaskStatus.Failed,
        errorType: SmsErrorType.NoAvailableNumber,
        errorMessage: "所有接码服务暂无可用号码",
        finishedAt: new Date().toISOString()
      });
      this.dependencies.smsTasks.createStatusLog({
        taskId: task.id,
        fromStatus: SmsTaskStatus.NumberAcquiring,
        toStatus: SmsTaskStatus.Failed,
        errorType: SmsErrorType.NoAvailableNumber,
        message: "所有接码服务暂无可用号码"
      });
      throw new SmsError(SmsErrorType.NoAvailableNumber, "所有接码服务暂无可用号码");
    }

    const phone = securePhoneNumber(acquired.data.phoneNumber, this.dependencies.securityKey);
    this.dependencies.smsTasks.update(task.id, {
      providerId: acquired.candidate.provider.id,
      providerOrderId: acquired.data.providerOrderId,
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
      phoneNumber: acquired.data.phoneNumber,
      platformCode: redeemCode.platform_code,
      platformName: redeemCode.platform_name,
      smsMode: redeemCode.sms_mode
    };
  }

  private async buildCandidates(smsMode: SmsMode, platformCode: string, countryCode: string): Promise<PricedCandidate[]> {
    const providers = this.dependencies.providers.listEnabledWithCapability(smsMode);
    const candidates = await Promise.all(
      providers.map(async (provider) => {
        const adapter = this.dependencies.providerAdapters.get(provider.name);
        if (!adapter) {
          return null;
        }

        const secret = provider.secret_encrypted ? revealProviderSecret(provider.secret_encrypted, this.dependencies.securityKey) : undefined;
        const price = await this.lookupLowestPrice(adapter, secret, provider, platformCode, countryCode);
        return { provider, adapter, secret, price } satisfies PricedCandidate;
      })
    );

    return candidates
      .filter((candidate): candidate is PricedCandidate => candidate !== null)
      .sort(comparePrice);
  }

  private async lookupLowestPrice(
    adapter: ProviderAdapter,
    secret: string | undefined,
    provider: ProviderConfigRecord,
    platformCode: string,
    countryCode: string
  ): Promise<number | null> {
    if (!adapter.listPrices) {
      return null;
    }

    const result = await adapter.listPrices({
      providerId: provider.id,
      providerSecret: secret,
      serviceCode: platformCode,
      countryCode
    });

    if (!result.ok) {
      logger.warn("Provider 查价失败，将兜底排序", {
        provider: provider.name,
        platformCode,
        countryCode,
        errorType: result.errorType,
        message: result.message
      });
      return null;
    }

    const prices = result.data
      .map((item) => Number(item.price))
      .filter((value) => Number.isFinite(value));

    return prices.length > 0 ? Math.min(...prices) : null;
  }

  private async acquireFromCandidates(
    taskId: string,
    candidates: PricedCandidate[],
    platformCode: string,
    countryCode: string,
    smsMode: SmsMode
  ) {
    for (const candidate of candidates) {
      const result = await this.acquireNumber(
        candidate.adapter,
        {
          providerId: candidate.provider.id,
          providerSecret: candidate.secret,
          serviceCode: platformCode,
          countryCode
        },
        smsMode
      );

      if (result.ok) {
        return { candidate, data: result.data };
      }

      logger.warn("拿号失败，尝试下一个 Provider", {
        taskId,
        provider: candidate.provider.name,
        price: candidate.price,
        errorType: result.errorType,
        message: result.message
      });
    }

    return null;
  }

  private acquireNumber(
    adapter: ProviderAdapter,
    request: Parameters<ProviderAdapter["acquireShortTermNumber"]>[0],
    smsMode: SmsMode
  ) {
    return smsMode === SmsMode.ShortTerm ? adapter.acquireShortTermNumber(request) : adapter.acquireLongTermNumber(request);
  }
}

function comparePrice(a: PricedCandidate, b: PricedCandidate): number {
  if (a.price === null && b.price === null) {
    return 0;
  }
  if (a.price === null) {
    return 1;
  }
  if (b.price === null) {
    return -1;
  }
  return a.price - b.price;
}
