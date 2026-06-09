import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_SALT = "sms-code-v2-security";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function encryptText(value: string, secretKey: string): string {
  if (!value) {
    return "";
  }

  const key = deriveKey(secretKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptText(value: string, secretKey: string): string {
  if (!value) {
    return "";
  }

  const [ivText, authTagText, encryptedText] = value.split(".");
  if (!ivText || !authTagText || !encryptedText) {
    throw new Error("Invalid encrypted text");
  }

  const key = deriveKey(secretKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivText, "base64url"), {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}

function deriveKey(secretKey: string): Buffer {
  return scryptSync(secretKey, KEY_SALT, 32);
}
