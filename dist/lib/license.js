"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStoreName = normalizeStoreName;
exports.normalizeDeviceId = normalizeDeviceId;
exports.generateLicenseKey = generateLicenseKey;
exports.validateLicenseKey = validateLicenseKey;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SECURE_SALT = process.env.SECURE_SALT || 'INSPIRA_POS_SECURE_SALT_2026';
/**
 * Normalizes store name for deterministic hashing (lowercase, trimmed, spaces normalized).
 */
function normalizeStoreName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
/**
 * Normalizes device ID.
 */
function normalizeDeviceId(deviceId) {
    return deviceId.trim().toLowerCase();
}
/**
 * Generates the expected license key offline for a given store name and device ID.
 */
function generateLicenseKey(storeName, deviceId) {
    const normalizedStore = normalizeStoreName(storeName);
    const normalizedDevice = normalizeDeviceId(deviceId);
    const input = `${normalizedStore}_${normalizedDevice}_${SECURE_SALT}`;
    const hashHex = crypto_1.default.createHash('sha256').update(input).digest('hex');
    // Take first 16 characters in uppercase
    const rawCode = hashHex.substring(0, 16).toUpperCase();
    // Format as XXXX-XXXX-XXXX-XXXX
    return `${rawCode.substring(0, 4)}-${rawCode.substring(4, 8)}-${rawCode.substring(8, 12)}-${rawCode.substring(12, 16)}`;
}
/**
 * Validates an input license key against the store name and device ID.
 */
function validateLicenseKey(storeName, deviceId, licenseKey) {
    if (!storeName || !deviceId || !licenseKey)
        return false;
    const expectedKey = generateLicenseKey(storeName, deviceId);
    return expectedKey === licenseKey.trim().toUpperCase();
}
