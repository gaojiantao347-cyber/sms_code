export const schemaSql = `
CREATE TABLE IF NOT EXISTS redeem_code (
  id text PRIMARY KEY,
  code_hash text NOT NULL,
  code_encrypted text,
  code_masked text NOT NULL,
  enabled integer NOT NULL,
  platform_code text NOT NULL,
  platform_name text NOT NULL,
  sms_mode text NOT NULL,
  provider_id text NOT NULL,
  service_code text,
  country_code text,
  operator text,
  max_price text,
  max_use_count integer NOT NULL,
  used_count integer NOT NULL,
  expires_at text,
  current_task_id text,
  last_used_at text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted integer NOT NULL,
  version integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_redeem_code_hash ON redeem_code(code_hash) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_redeem_code_enabled ON redeem_code(enabled, deleted);
CREATE INDEX IF NOT EXISTS idx_redeem_code_platform ON redeem_code(platform_code, deleted);
CREATE INDEX IF NOT EXISTS idx_redeem_code_provider ON redeem_code(provider_id, deleted);
CREATE INDEX IF NOT EXISTS idx_redeem_code_current_task ON redeem_code(current_task_id);

CREATE TABLE IF NOT EXISTS provider_config (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled integer NOT NULL,
  secret_encrypted text,
  secret_masked text,
  default_service_code text,
  default_country_code text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted integer NOT NULL,
  version integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_enabled ON provider_config(enabled, deleted);
CREATE INDEX IF NOT EXISTS idx_provider_name ON provider_config(name, deleted);

CREATE TABLE IF NOT EXISTS provider_capability (
  id text PRIMARY KEY,
  provider_id text NOT NULL,
  capability_code text NOT NULL,
  enabled integer NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  UNIQUE(provider_id, capability_code)
);

CREATE INDEX IF NOT EXISTS idx_capability_code ON provider_capability(capability_code, enabled);

CREATE TABLE IF NOT EXISTS long_term_number (
  id text PRIMARY KEY,
  provider_id text NOT NULL,
  phone_number_encrypted text NOT NULL,
  phone_number_masked text NOT NULL,
  enabled integer NOT NULL,
  bound_redeem_code_id text,
  current_task_id text,
  last_used_at text,
  use_count integer NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted integer NOT NULL,
  version integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_long_term_provider ON long_term_number(provider_id, enabled, deleted);
CREATE INDEX IF NOT EXISTS idx_long_term_redeem_code ON long_term_number(bound_redeem_code_id, deleted);
CREATE INDEX IF NOT EXISTS idx_long_term_current_task ON long_term_number(current_task_id);

CREATE TABLE IF NOT EXISTS sms_task (
  id text PRIMARY KEY,
  redeem_code_id text NOT NULL,
  provider_id text NOT NULL,
  long_term_number_id text,
  platform_code text NOT NULL,
  platform_name text NOT NULL,
  sms_mode text NOT NULL,
  provider_order_id text,
  phone_number_encrypted text,
  phone_number_masked text,
  sms_code_encrypted text,
  status text NOT NULL,
  error_type text,
  error_message text,
  wait_started_at text,
  wait_timeout_at text,
  code_received_at text,
  finished_at text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  version integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_task_redeem_code ON sms_task(redeem_code_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_task_status ON sms_task(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_sms_task_provider ON sms_task(provider_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_task_platform ON sms_task(platform_code, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_task_sms_mode ON sms_task(sms_mode, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_task_wait_timeout ON sms_task(status, wait_timeout_at);

CREATE TABLE IF NOT EXISTS sms_task_status_log (
  id text PRIMARY KEY,
  task_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  error_type text,
  message text,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_status_log_task ON sms_task_status_log(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_status_log_status ON sms_task_status_log(to_status, created_at);
`;
