export const SmsErrorType = {
  InvalidRedeemCode: "invalid_redeem_code",
  RedeemCodeExpired: "redeem_code_expired",
  RedeemCodeUsedUp: "redeem_code_used_up",
  RedeemCodeDisabled: "redeem_code_disabled",
  RedeemCodeInUse: "redeem_code_in_use",
  PlatformNotConfigured: "platform_not_configured",
  SmsModeNotConfigured: "sms_mode_not_configured",
  ProviderNotConfigured: "provider_not_configured",
  ProviderUnavailable: "provider_unavailable",
  CapabilityNotSupported: "capability_not_supported",
  NoAvailableNumber: "no_available_number",
  InsufficientBalance: "insufficient_balance",
  AcquireNumberFailed: "acquire_number_failed",
  WaitCodeTimeout: "wait_code_timeout",
  CodeParseFailed: "code_parse_failed",
  TaskNotFound: "task_not_found",
  TaskStateConflict: "task_state_conflict",
  UserCancelled: "user_cancelled",
  Unauthorized: "unauthorized",
  InternalError: "internal_error"
} as const;

export type SmsErrorType = (typeof SmsErrorType)[keyof typeof SmsErrorType];
