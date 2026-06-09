export const ProviderCapability = {
  ShortTermRental: "short_term_rental",
  LongTermRental: "long_term_rental",
  WaitCode: "wait_code",
  Cancel: "cancel"
} as const;

export type ProviderCapability = (typeof ProviderCapability)[keyof typeof ProviderCapability];
