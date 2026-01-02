/**
 * Settings Persistence Utility
 * 
 * Uses IndexedDB via Dexie to persist user settings
 * Never use localStorage/sessionStorage per project rules
 */

import { db } from '../db/database';

// Settings key prefix to avoid collisions
const SETTINGS_PREFIX = 'dcim_settings_';

/**
 * Generate a settings key with prefix
 */
export function settingsKey(key: string): string {
  return `${SETTINGS_PREFIX}${key}`;
}

/**
 * Get a setting from IndexedDB
 */
export async function getSettings<T>(key: string): Promise<T | null> {
  try {
    const record = await db.settings.get(key);
    return record?.value as T || null;
  } catch (error) {
    console.error(`Failed to get setting "${key}":`, error);
    return null;
  }
}

/**
 * Save a setting to IndexedDB
 */
export async function saveSettings<T>(key: string, value: T): Promise<void> {
  try {
    await db.settings.put({
      key,
      value,
    });
  } catch (error) {
    console.error(`Failed to save setting "${key}":`, error);
    throw error;
  }
}

/**
 * Delete a setting from IndexedDB
 */
export async function deleteSetting(key: string): Promise<void> {
  try {
    await db.settings.delete(key);
  } catch (error) {
    console.error(`Failed to delete setting "${key}":`, error);
    throw error;
  }
}

/**
 * Get all settings with a given prefix
 */
export async function getAllSettings(prefix?: string): Promise<Record<string, any>> {
  try {
    const allSettings = await db.settings.toArray();
    const filtered = prefix 
      ? allSettings.filter(s => s.id.startsWith(prefix))
      : allSettings;
    
    const result: Record<string, any> = {};
    filtered.forEach(s => {
      result[s.id] = s.value;
    });
    return result;
  } catch (error) {
    console.error('Failed to get all settings:', error);
    return {};
  }
}

/**
 * Clear all settings (for reset)
 */
export async function clearAllSettings(): Promise<void> {
  try {
    await db.settings.clear();
  } catch (error) {
    console.error('Failed to clear settings:', error);
    throw error;
  }
}

// Type for settings record in database
export interface SettingsRecord {
  id: string;
  value: any;
  updatedAt: string;
}

