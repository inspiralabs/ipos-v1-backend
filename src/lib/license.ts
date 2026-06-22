import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SECURE_SALT_LITE = process.env.SECURE_SALT_LITE || 'INSPIRA_POS_SECURE_SALT_LITE_2026';
const SECURE_SALT_PRO  = process.env.SECURE_SALT_PRO || 'INSPIRA_POS_SECURE_SALT_PRO_2026';

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
 * Generates the expected license key offline for a given device ID and tier.
 */
export function generateLicenseKey(deviceId: string, tier: 'LITE' | 'PRO'): string {
  const salt = tier === 'PRO' ? SECURE_SALT_PRO : SECURE_SALT_LITE;
  const normalizedDevice = normalizeDeviceId(deviceId);
  const input = `${normalizedDevice}_${salt}`;
  
  const hashHex = crypto.createHash('sha256').update(input).digest('hex');
  
  // Take first 16 characters in uppercase
  const rawCode = hashHex.substring(0, 16).toUpperCase();
  
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${rawCode.substring(0, 4)}-${rawCode.substring(4, 8)}-${rawCode.substring(8, 12)}-${rawCode.substring(12, 16)}`;
}

/**
 * Validates an input license key against the device ID.
 */
export function validateLicenseKey(
  deviceId: string,
  licenseKey: string
): { valid: boolean; tier: 'LITE' | 'PRO' | null } {
  if (!deviceId || !licenseKey) return { valid: false, tier: null };
  const sanitizedInput = licenseKey.trim().toUpperCase();
  
  const liteKey = generateLicenseKey(deviceId, 'LITE');
  const proKey = generateLicenseKey(deviceId, 'PRO');
  
  if (sanitizedInput === proKey) {
    return { valid: true, tier: 'PRO' };
  }
  if (sanitizedInput === liteKey) {
    return { valid: true, tier: 'LITE' };
  }
  return { valid: false, tier: null };
}
