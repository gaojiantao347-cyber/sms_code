import type { ProviderCapability } from "../../domain/provider/ProviderCapability.js";
import type { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import type { SmsMode } from "../../domain/sms-task/SmsMode.js";
import type { SmsTaskStatus } from "../../domain/sms-task/SmsTaskStatus.js";

export type RedeemCodeRecord = {
  id: string;
  code_hash: string;
  code_encrypted: string | null;
  code_masked: string;
  enabled: number;
  platform_code: string;
  platform_name: string;
  sms_mode: SmsMode;
  country_code: string;
  max_use_count: number;
  used_count: number;
  expires_at: string | null;
  current_task_id: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted: number;
  version: number;
};

export type PlatformCatalogRecord = {
  code: string;
  name: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type CountryCatalogRecord = {
  code: string;
  name: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type ProviderConfigRecord = {
  id: string;
  name: string;
  enabled: number;
  secret_encrypted: string | null;
  secret_masked: string | null;
  created_at: string;
  updated_at: string;
  deleted: number;
  version: number;
};

export type ProviderCapabilityRecord = {
  id: string;
  provider_id: string;
  capability_code: ProviderCapability;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type LongTermNumberRecord = {
  id: string;
  provider_id: string;
  phone_number_encrypted: string;
  phone_number_masked: string;
  enabled: number;
  bound_redeem_code_id: string | null;
  current_task_id: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
  updated_at: string;
  deleted: number;
  version: number;
};

export type SmsTaskRecord = {
  id: string;
  redeem_code_id: string;
  provider_id: string;
  long_term_number_id: string | null;
  platform_code: string;
  platform_name: string;
  sms_mode: SmsMode;
  provider_order_id: string | null;
  phone_number_encrypted: string | null;
  phone_number_masked: string | null;
  sms_code_encrypted: string | null;
  status: SmsTaskStatus;
  error_type: SmsErrorType | null;
  error_message: string | null;
  wait_started_at: string | null;
  wait_timeout_at: string | null;
  code_received_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export type SmsTaskStatusLogRecord = {
  id: string;
  task_id: string;
  from_status: SmsTaskStatus | null;
  to_status: SmsTaskStatus;
  error_type: SmsErrorType | null;
  message: string | null;
  created_at: string;
};
