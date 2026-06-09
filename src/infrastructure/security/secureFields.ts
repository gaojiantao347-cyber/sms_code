import { decryptText, encryptText, sha256 } from "./crypto.js";
import { maskCode, maskPhoneNumber, maskRedeemCode, maskSecret } from "./masking.js";

export function hashRedeemCode(code: string): string {
  return sha256(normalizeRedeemCode(code));
}

export function secureRedeemCode(code: string, secretKey: string): { codeHash: string; codeEncrypted: string; codeMasked: string } {
  const normalizedCode = normalizeRedeemCode(code);
  return {
    codeHash: sha256(normalizedCode),
    codeEncrypted: encryptText(normalizedCode, secretKey),
    codeMasked: maskRedeemCode(normalizedCode)
  };
}

export function revealRedeemCode(codeEncrypted: string, secretKey: string): string {
  return decryptText(codeEncrypted, secretKey);
}

export function securePhoneNumber(phoneNumber: string, secretKey: string): { phoneNumberEncrypted: string; phoneNumberMasked: string } {
  return {
    phoneNumberEncrypted: encryptText(phoneNumber, secretKey),
    phoneNumberMasked: maskPhoneNumber(phoneNumber)
  };
}

export function revealPhoneNumber(phoneNumberEncrypted: string, secretKey: string): string {
  return decryptText(phoneNumberEncrypted, secretKey);
}

export function secureSmsCode(code: string, secretKey: string): { smsCodeEncrypted: string; smsCodeMasked: string } {
  return {
    smsCodeEncrypted: encryptText(code, secretKey),
    smsCodeMasked: maskCode(code)
  };
}

export function revealSmsCode(smsCodeEncrypted: string, secretKey: string): string {
  return decryptText(smsCodeEncrypted, secretKey);
}

export function secureProviderSecret(secret: string, secretKey: string): { secretEncrypted: string; secretMasked: string } {
  return {
    secretEncrypted: encryptText(secret, secretKey),
    secretMasked: maskSecret(secret)
  };
}

export function revealProviderSecret(secretEncrypted: string, secretKey: string): string {
  return decryptText(secretEncrypted, secretKey);
}

function normalizeRedeemCode(code: string): string {
  return code.trim().toUpperCase();
}
