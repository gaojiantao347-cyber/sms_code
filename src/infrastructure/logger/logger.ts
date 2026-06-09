import { sanitizeLogFields } from "../security/masking.js";

export const logger = {
  info(message: string, fields?: Record<string, unknown>): void {
    console.info(message, fields ? sanitizeLogFields(fields) : undefined);
  },

  warn(message: string, fields?: Record<string, unknown>): void {
    console.warn(message, fields ? sanitizeLogFields(fields) : undefined);
  },

  error(message: string, fields?: Record<string, unknown>): void {
    console.error(message, fields ? sanitizeLogFields(fields) : undefined);
  }
};
