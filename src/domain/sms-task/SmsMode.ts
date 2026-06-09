export const SmsMode = {
  ShortTerm: "short_term",
  LongTerm: "long_term"
} as const;

export type SmsMode = (typeof SmsMode)[keyof typeof SmsMode];
