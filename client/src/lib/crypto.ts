/**
 * End-to-End Encryption (E2EE) Utilities
 * Uses Web Crypto API with RSA-OAEP for key exchange and AES-GCM for message encryption
 */

// Convert ArrayBuffer to base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a random salt for key derivation
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64(salt.buffer);
}

// Derive a key from password using PBKDF2
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToArrayBuffer(salt);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key from password
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate RSA key pair for asymmetric encryption
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export public key to base64
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

// Import public key from base64
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

// Export private key to base64
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  return arrayBufferToBase64(exported);
}

// Import private key from base64
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
}

// Encrypt private key with password-derived key
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  password: string,
  salt: string
): Promise<{ encryptedKey: string; iv: string }> {
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const privateKeyData = await exportPrivateKey(privateKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKeyData);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  );

  return {
    encryptedKey: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt private key with password-derived key
export async function decryptPrivateKey(
  encryptedKey: string,
  password: string,
  salt: string,
  iv: string
): Promise<CryptoKey> {
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const encryptedBuffer = base64ToArrayBuffer(encryptedKey);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    derivedKey,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  const privateKeyBase64 = decoder.decode(decrypted);
  return importPrivateKey(privateKeyBase64);
}

// Generate symmetric key for message encryption
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export symmetric key to raw format
export async function exportSymmetricKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

// Import symmetric key from raw format
export async function importSymmetricKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt message content with symmetric key
export async function encryptMessage(
  content: string,
  symmetricKey: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    data
  );

  return {
    encryptedContent: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt message content with symmetric key
export async function decryptMessage(
  encryptedContent: string,
  symmetricKey: CryptoKey,
  iv: string
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedContent);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    symmetricKey,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Encrypt symmetric key with recipient's public key
export async function encryptSymmetricKey(
  symmetricKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  const keyData = await exportSymmetricKey(symmetricKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(keyData);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    data
  );

  return arrayBufferToBase64(encrypted);
}

// Decrypt symmetric key with private key
export async function decryptSymmetricKey(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedKey);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  const keyData = decoder.decode(decrypted);
  return importSymmetricKey(keyData);
}

// Generate fingerprint for public key verification
export async function generateKeyFingerprint(publicKey: CryptoKey): Promise<string> {
  const exported = await exportPublicKey(publicKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(exported);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hash).substring(0, 16);
}

// Store private key in sessionStorage (for current session only)
export function storePrivateKeyInSession(privateKey: string): void {
  sessionStorage.setItem('e2ee_private_key', privateKey);
}

// Retrieve private key from sessionStorage
export function getPrivateKeyFromSession(): string | null {
  return sessionStorage.getItem('e2ee_private_key');
}

// Clear private key from sessionStorage
export function clearPrivateKeyFromSession(): void {
  sessionStorage.removeItem('e2ee_private_key');
}
