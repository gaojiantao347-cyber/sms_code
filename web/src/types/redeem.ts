export const SmsMode = {
  ShortTerm: "short_term",
  LongTerm: "long_term"
} as const;

export type SmsMode = (typeof SmsMode)[keyof typeof SmsMode];

export type RedeemCodeRequest = {
  code: string;
};

export type RedeemCodeResult = {
  taskId: string;
  phoneNumber: string;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
};

export type AdminRedeemCodeQuery = {
  codeKeyword?: string;
  platformCode?: string;
  smsMode?: SmsMode;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminRedeemCodeItem = {
  id: string;
  code: string | null;
  codeMasked: string;
  enabled: boolean;
  platform: { code: string; name: string };
  smsMode: SmsMode;
  providerId: string;
  serviceCode: string | null;
  countryCode: string | null;
  operator: string | null;
  maxPrice: string | null;
  maxUseCount: number;
  usedCount: number;
  expiresAt: string | null;
  currentTaskId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminRedeemCodeListResult = {
  items: AdminRedeemCodeItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminRedeemCodeCreateInput = {
  enabled?: boolean;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
  providerId: string;
  serviceCode?: string | null;
  countryCode?: string | null;
  operator?: string | null;
  maxPrice?: string | null;
  maxUseCount: number;
  expiresAt?: string | null;
};

export type AdminRedeemCodeCreateResult = AdminRedeemCodeItem & {
  code: string;
};

export type AdminRedeemCodeUpdateInput = Partial<AdminRedeemCodeCreateInput>;
