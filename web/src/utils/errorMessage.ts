import { ApiClientError } from "../types/api";
import { SmsErrorType, type SmsErrorType as SmsErrorTypeValue } from "../types/error";

const defaultErrorMessages: Record<SmsErrorTypeValue, string> = {
  [SmsErrorType.InvalidRedeemCode]: "兑换码无效",
  [SmsErrorType.RedeemCodeExpired]: "兑换码已过期",
  [SmsErrorType.RedeemCodeUsedUp]: "兑换码已使用完",
  [SmsErrorType.RedeemCodeDisabled]: "兑换码已被禁用",
  [SmsErrorType.RedeemCodeInUse]: "该兑换码已有进行中的任务",
  [SmsErrorType.PlatformNotConfigured]: "兑换码未配置目标平台",
  [SmsErrorType.SmsModeNotConfigured]: "兑换码未配置接码类型",
  [SmsErrorType.ProviderNotConfigured]: "接码服务未配置",
  [SmsErrorType.ProviderUnavailable]: "接码服务暂不可用",
  [SmsErrorType.CapabilityNotSupported]: "当前接码类型暂不支持",
  [SmsErrorType.NoAvailableNumber]: "暂无可用手机号",
  [SmsErrorType.InsufficientBalance]: "接码服务余额不足",
  [SmsErrorType.AcquireNumberFailed]: "获取手机号失败",
  [SmsErrorType.WaitCodeTimeout]: "等待验证码超时",
  [SmsErrorType.CodeParseFailed]: "未能识别验证码",
  [SmsErrorType.TaskNotFound]: "任务不存在",
  [SmsErrorType.TaskStateConflict]: "当前任务状态不允许该操作",
  [SmsErrorType.UserCancelled]: "用户已取消任务",
  [SmsErrorType.Unauthorized]: "无权访问",
  [SmsErrorType.InternalError]: "系统异常，请稍后重试"
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const message = error.message || defaultErrorMessages[error.type];
    return error.requestId ? `${message}（requestId: ${error.requestId}）` : message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败，请稍后重试";
}
