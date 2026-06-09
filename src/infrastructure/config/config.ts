import "dotenv/config";

export type AppConfig = {
  port: number;
  nodeEnv: string;
  logLevel: string;
  databasePath: string;
  securityKey: string;
  adminToken: string;
};

export function loadConfig(): AppConfig {
  return {
    port: readPort(process.env.PORT),
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info",
    databasePath: process.env.DATABASE_PATH ?? "./data/sms-code.sqlite",
    securityKey: process.env.SECURITY_KEY ?? "development-only-security-key",
    adminToken: process.env.ADMIN_TOKEN ?? "development-only-admin-token"
  };
}

function readPort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return 3000;
  }

  return port;
}
