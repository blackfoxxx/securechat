/**
 * E2EE Helper for encrypting and decrypting messages
 * Simplified implementation for secure chat
 */

import {
  generateSymmetricKey,
  encryptMessage,
  decryptMessage,
  encryptSymmetricKey,
  decryptSymmetricKey,
  importPublicKey,
  importPrivateKey,
  generateKeyFingerprint,
} from "./crypto";

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  encryptedKey: string;
  senderKeyFingerprint: string;
}

/**
 * Encrypt a message for a recipient
 */
export async function encryptMessageForRecipient(
  content: string,
  recipientPublicKeyBase64: string,
  senderPublicKeyBase64: string
): Promise<EncryptedMessage> {
  // Generate symmetric key for this message
  const symmetricKey = await generateSymmetricKey();

  // Encrypt message content with symmetric key
  const { encryptedContent, iv } = await encryptMessage(content, symmetricKey);

  // Import recipient's public key
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);

  // Encrypt symmetric key with recipient's public key
  const encryptedKey = await encryptSymmetricKey(symmetricKey, recipientPublicKey);

  // Generate sender's key fingerprint for verification
  const senderPublicKey = await importPublicKey(senderPublicKeyBase64);
  const senderKeyFingerprint = await generateKeyFingerprint(senderPublicKey);

  return {
    encryptedContent,
    iv,
    encryptedKey,
    senderKeyFingerprint,
  };
}

/**
 * Decrypt a message with private key
 */
export async function decryptMessageWithPrivateKey(
  encryptedContent: string,
  iv: string,
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<string> {
  // Decrypt symmetric key with private key
  const symmetricKey = await decryptSymmetricKey(encryptedKey, privateKey);

  // Decrypt message content with symmetric key
  const content = await decryptMessage(encryptedContent, symmetricKey, iv);

  return content;
}

/**
 * Check if a message is encrypted
 */
export function isMessageEncrypted(message: any): boolean {
  return !!(message.encryptedContent && message.iv && message.encryptedKey);
}
