const DEFAULT_MASK = "***";

export function maskRedeemCode(value: string): string {
  return maskMiddle(value, 4, 4);
}

export function maskPhoneNumber(value: string): string {
  return maskMiddle(value, 3, 4);
}

export function maskCode(value: string): string {
  return value ? DEFAULT_MASK : "";
}

export function maskSecret(value: string): string {
  return maskMiddle(value, 2, 2);
}

export function sanitizeLogFields<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogFields(item)) as T;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => {
      if (typeof fieldValue === "string" && isSensitiveKey(key)) {
        return [key, DEFAULT_MASK];
      }

      return [key, sanitizeLogFields(fieldValue)];
    })
  ) as T;
}

function maskMiddle(value: string, prefixLength: number, suffixLength: number): string {
  if (!value) {
    return "";
  }

  if (value.length <= prefixLength + suffixLength) {
    return DEFAULT_MASK;
  }

  return `${value.slice(0, prefixLength)}${DEFAULT_MASK}${value.slice(-suffixLength)}`;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["code", "redeemcode", "smscode", "phonenumber", "phone", "secret", "token", "verificationcode", "encrypted"].some(
    (name) => normalized.includes(name)
  );
}
