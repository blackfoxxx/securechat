/**
 * Security Code Generation for Key Verification
 * Generates numeric security codes and QR codes from public key fingerprints
 */

import { generateKeyFingerprint, importPublicKey } from "./crypto";

/**
 * Generate a combined fingerprint from two public keys
 * The order matters - always use consistent ordering (lower ID first)
 */
export async function generateCombinedFingerprint(
  publicKey1: string,
  publicKey2: string,
  userId1: number,
  userId2: number
): Promise<string> {
  // Ensure consistent ordering by user ID
  const [firstKey, secondKey] = userId1 < userId2 
    ? [publicKey1, publicKey2] 
    : [publicKey2, publicKey1];

  // Import keys and generate fingerprints
  const key1 = await importPublicKey(firstKey);
  const key2 = await importPublicKey(secondKey);
  
  const fingerprint1 = await generateKeyFingerprint(key1);
  const fingerprint2 = await generateKeyFingerprint(key2);
  
  // Combine fingerprints
  const combined = fingerprint1 + fingerprint2;
  
  // Hash the combined fingerprints
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return hashBase64;
}

/**
 * Generate a 60-digit numeric security code from fingerprint
 * Format: 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890
 */
export function generateNumericSecurityCode(fingerprint: string): string {
  // Convert base64 to bytes
  const bytes = atob(fingerprint);
  const numbers: number[] = [];
  
  // Convert each byte to a number
  for (let i = 0; i < bytes.length && numbers.length < 60; i++) {
    const byte = bytes.charCodeAt(i);
    // Convert byte to 2-3 digits
    const digits = byte.toString().padStart(3, '0');
    for (let j = 0; j < digits.length && numbers.length < 60; j++) {
      numbers.push(parseInt(digits[j]));
    }
  }
  
  // Ensure we have exactly 60 digits
  while (numbers.length < 60) {
    numbers.push(0);
  }
  
  // Format as groups of 5
  const formatted: string[] = [];
  for (let i = 0; i < 60; i += 5) {
    formatted.push(numbers.slice(i, i + 5).join(''));
  }
  
  return formatted.join(' ');
}

/**
 * Generate QR code data URL from security code
 */
export async function generateQRCode(securityCode: string): Promise<string> {
  // For now, return a placeholder
  // In production, you would use a QR code library like qrcode
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-size="12" fill="black">
        QR Code
      </text>
      <text x="100" y="120" text-anchor="middle" font-size="8" fill="gray">
        ${securityCode.substring(0, 20)}...
      </text>
    </svg>
  `)}`;
}

/**
 * Compare two security codes
 */
export function compareSecurityCodes(code1: string, code2: string): boolean {
  // Remove spaces and compare
  const clean1 = code1.replace(/\s/g, '');
  const clean2 = code2.replace(/\s/g, '');
  return clean1 === clean2;
}

/**
 * Format security code for display with line breaks
 */
export function formatSecurityCodeForDisplay(code: string): string[] {
  const groups = code.split(' ');
  const lines: string[] = [];
  
  // Split into lines of 6 groups each (30 digits per line)
  for (let i = 0; i < groups.length; i += 6) {
    lines.push(groups.slice(i, i + 6).join(' '));
  }
  
  return lines;
}

/**
 * Get verification status text
 */
export function getVerificationStatusText(isVerified: boolean, keyChanged: boolean): {
  text: string;
  color: string;
  icon: string;
} {
  if (keyChanged) {
    return {
      text: "Security code changed",
      color: "text-red-600",
      icon: "⚠️"
    };
  }
  
  if (isVerified) {
    return {
      text: "Verified",
      color: "text-green-600",
      icon: "✓"
    };
  }
  
  return {
    text: "Not verified",
    color: "text-gray-500",
    icon: "○"
  };
}
