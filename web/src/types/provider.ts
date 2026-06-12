export const ProviderCapability = {
  ShortTermRental: "short_term_rental",
  LongTermRental: "long_term_rental",
  WaitCode: "wait_code",
  Cancel: "cancel"
} as const;

export type ProviderCapability = (typeof ProviderCapability)[keyof typeof ProviderCapability];

export type AdminProviderQuery = {
  nameKeyword?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminProviderCapabilityInput = {
  capabilityCode: ProviderCapability;
  enabled: boolean;
};

export type AdminProviderItem = {
  id: string;
  name: string;
  enabled: boolean;
  secretConfigured: boolean;
  secretMasked: string | null;
  capabilities: AdminProviderCapabilityInput[];
  createdAt: string;
  updatedAt: string;
};

export type AdminProviderListResult = {
  items: AdminProviderItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminProviderAdapterOption = {
  code: string;
  supportsCatalogSync: boolean;
};

export type AdminProviderCreateInput = {
  name: string;
  enabled?: boolean;
  secret?: string | null;
  capabilities?: AdminProviderCapabilityInput[];
};

export type AdminProviderUpdateInput = Partial<AdminProviderCreateInput>;
