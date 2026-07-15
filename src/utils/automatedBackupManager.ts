/**
 * Automated Backup Manager
 * 
 * Schedules and manages automatic data exports
 * Ensures user data is regularly backed up
 * 
 * Part of Phase 4: Backup & Recovery
 * R-F8: backups are durably persisted (separate 'ComplianceBackups' database),
 * integrity-verified by SHA-256 read-back, retained as history, and failures
 * propagate to callers instead of being swallowed.
 */

import { exportAllData, downloadBackup } from './dbRecovery';
import { db } from '../db/database';
import { persistBackup, type BackupMeta } from './backupStore';

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'manual';
  lastBackup: number | null;
  nextBackup: number | null;
  /** Message of the most recent backup failure; null after a success. */
  lastError?: string | null;
}

class AutomatedBackupManager {
  private schedule: BackupSchedule = {
    enabled: true,
    frequency: 'daily',
    lastBackup: null,
    nextBackup: null
  };
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSchedule().catch(console.warn);
  }

  /**
   * Start automated backup system
   */
  start(): void {
    if (this.checkInterval) {
      console.warn('Backup manager already running');
      return;
    }

    console.log('💾 Starting automated backup manager...');

    // Check if backup is due immediately
    this.checkAndBackup();

    // Check every hour if backup is due
    this.checkInterval = setInterval(() => {
      this.checkAndBackup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Stop automated backups
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('💾 Backup manager stopped');
    }
  }

  /**
   * Check if backup is due and perform it
   */
  private async checkAndBackup(): Promise<void> {
    if (!this.schedule.enabled) {
      return;
    }

    const now = Date.now();

    // Background timer path: performBackup propagates failures, so catch here
    // and retain the error in schedule state (surfaced by the health monitor).
    const runScheduled = async (): Promise<void> => {
      try {
        await this.performBackup();
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    };

    // If no last backup, do one now
    if (!this.schedule.lastBackup) {
      await runScheduled();
      return;
    }

    // Check if it's time for next backup
    if (this.schedule.nextBackup && now >= this.schedule.nextBackup) {
      await runScheduled();
    }
  }

  /**
   * Perform a backup (R-F8).
   *
   * Exports all data, durably persists the bytes with an integrity digest and
   * read-back verification, retains history, and updates the schedule only
   * after the bytes are proven stored. Any failure (export, write, or
   * verification) is recorded on the schedule and RETHROWN — a failed backup
   * never reports success.
   */
  async performBackup(): Promise<BackupMeta> {
    try {
      const data = await exportAllData();
      const record = await persistBackup(data);

      const now = Date.now();
      this.schedule.lastBackup = now;
      this.schedule.nextBackup = this.calculateNextBackup(now);
      this.schedule.lastError = null;
      await this.saveSchedule();

      this.notifyBackupComplete();

      const { payload: _payload, ...meta } = record;
      return meta;
    } catch (error) {
      this.schedule.lastError = error instanceof Error ? error.message : String(error);
      await this.saveSchedule().catch(() => undefined);
      throw error;
    }
  }

  /**
   * Calculate next backup time based on frequency
   */
  private calculateNextBackup(fromTime: number): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const msPerWeek = 7 * msPerDay;

    switch (this.schedule.frequency) {
      case 'daily':
        return fromTime + msPerDay;
      case 'weekly':
        return fromTime + msPerWeek;
      case 'manual':
        return fromTime + (365 * msPerDay); // Far future
      default:
        return fromTime + msPerDay;
    }
  }

  /**
   * Notify user that backup is complete
   */
  private notifyBackupComplete(): void {
    // Could show a toast notification
    // For now, just log
    console.log('💾 Backup notification: Data backup completed successfully');
  }

  /**
   * Manually trigger a backup. Failures propagate to the caller (R-F8).
   */
  async backupNow(): Promise<BackupMeta> {
    return this.performBackup();
  }

  /**
   * Download latest backup
   */
  async downloadLatestBackup(): Promise<void> {
    await downloadBackup();
  }

  /**
   * Get backup schedule info
   */
  getSchedule(): BackupSchedule {
    return { ...this.schedule };
  }

  /**
   * Update backup schedule
   */
  setSchedule(updates: Partial<BackupSchedule>): void {
    this.schedule = { ...this.schedule, ...updates };
    
    // Recalculate next backup if frequency changed
    if (updates.frequency && this.schedule.lastBackup) {
      this.schedule.nextBackup = this.calculateNextBackup(this.schedule.lastBackup);
    }
    
    this.saveSchedule();
    console.warn('💾 Backup schedule updated:', this.schedule);
  }

  /**
   * Load schedule from IndexedDB
   */
  private async loadSchedule(): Promise<void> {
    try {
      // Store backup schedule in settings table
      const settings = await db.table('settings').get('backup_schedule');
      if (settings) {
        this.schedule = settings.value as BackupSchedule;
      }
    } catch (error) {
      console.warn('Could not load backup schedule:', error);
    }
  }

  /**
   * Save schedule to IndexedDB
   */
  private async saveSchedule(): Promise<void> {
    try {
      await db.table('settings').put({
        key: 'backup_schedule',
        value: this.schedule,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.warn('Could not save backup schedule:', error);
    }
  }

  /**
   * Get time until next backup (in milliseconds)
   */
  getTimeUntilNextBackup(): number {
    if (!this.schedule.nextBackup) {
      return 0;
    }
    return Math.max(0, this.schedule.nextBackup - Date.now());
  }

  /**
   * Check if backup is overdue
   */
  isBackupOverdue(): boolean {
    if (!this.schedule.nextBackup) {
      return false;
    }
    return Date.now() > this.schedule.nextBackup;
  }
}

// Singleton instance
export const automatedBackupManager = new AutomatedBackupManager();

// Auto-start on import
automatedBackupManager.start();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    automatedBackupManager.stop();
  });
}

// Export convenience functions
export function backupNow(): Promise<BackupMeta> {
  return automatedBackupManager.backupNow();
}

export function getBackupSchedule(): BackupSchedule {
  return automatedBackupManager.getSchedule();
}

export function setBackupSchedule(updates: Partial<BackupSchedule>): void {
  return automatedBackupManager.setSchedule(updates);
}

export function getTimeUntilNextBackup(): number {
  return automatedBackupManager.getTimeUntilNextBackup();
}

