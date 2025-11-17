import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  encryptPrivateKey,
  generateSalt,
} from "./crypto";
import { trpc } from "./trpc";

/**
 * Hash a recovery code for secure storage
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Setup E2EE for a user by generating keys and storing them
 */
export async function setupE2EE(
  password: string,
  recoveryCodes: string[]
): Promise<{
  publicKey: string;
  encryptedPrivateKey: string;
  keySalt: string;
  iv: string;
  hashedRecoveryCodes: string[];
}> {
  // Generate RSA key pair
  const keyPair = await generateKeyPair();

  // Export public key
  const publicKey = await exportPublicKey(keyPair.publicKey);

  // Generate salt for password-based key derivation
  const keySalt = generateSalt();

  // Encrypt private key with password
  const { encryptedKey, iv } = await encryptPrivateKey(
    keyPair.privateKey,
    password,
    keySalt
  );

  // Hash recovery codes for secure storage
  const hashedRecoveryCodes = await Promise.all(
    recoveryCodes.map((code) => hashRecoveryCode(code))
  );

  return {
    publicKey,
    encryptedPrivateKey: encryptedKey,
    keySalt,
    iv,
    hashedRecoveryCodes,
  };
}

/**
 * Verify a recovery code against stored hashes
 */
export async function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): Promise<boolean> {
  const hash = await hashRecoveryCode(code);
  return hashedCodes.includes(hash);
}
