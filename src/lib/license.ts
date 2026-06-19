import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SECURE_SALT = process.env.SECURE_SALT || 'INSPIRA_POS_SECURE_SALT_2026';

/**
 * Normalizes store name for deterministic hashing (lowercase, trimmed, spaces normalized).
 */
export function normalizeStoreName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes device ID.
 */
export function normalizeDeviceId(deviceId: string): string {
  return deviceId.trim().toLowerCase();
}

/**
 * Generates the expected license key offline for a given store name and device ID.
 */
export function generateLicenseKey(storeName: string, deviceId: string): string {
  const normalizedStore = normalizeStoreName(storeName);
  const normalizedDevice = normalizeDeviceId(deviceId);
  const input = `${normalizedStore}_${normalizedDevice}_${SECURE_SALT}`;
  
  const hashHex = crypto.createHash('sha256').update(input).digest('hex');
  
  // Take first 16 characters in uppercase
  const rawCode = hashHex.substring(0, 16).toUpperCase();
  
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${rawCode.substring(0, 4)}-${rawCode.substring(4, 8)}-${rawCode.substring(8, 12)}-${rawCode.substring(12, 16)}`;
}

/**
 * Validates an input license key against the store name and device ID.
 */
export function validateLicenseKey(storeName: string, deviceId: string, licenseKey: string): boolean {
  if (!storeName || !deviceId || !licenseKey) return false;
  const expectedKey = generateLicenseKey(storeName, deviceId);
  return expectedKey === licenseKey.trim().toUpperCase();
}
