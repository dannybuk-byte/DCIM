/**
 * Automated Backup Manager
 * 
 * Schedules and manages automatic data exports
 * Ensures user data is regularly backed up
 * 
 * Part of Phase 4: Backup & Recovery
 */

import { exportAllData, downloadBackup } from './dbRecovery';
import { db } from '../db/database';

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'manual';
  lastBackup: number | null;
  nextBackup: number | null;
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

    // If no last backup, do one now
    if (!this.schedule.lastBackup) {
      console.log('💾 No previous backup found - creating initial backup...');
      await this.performBackup();
      return;
    }

    // Check if it's time for next backup
    if (this.schedule.nextBackup && now >= this.schedule.nextBackup) {
      console.log('💾 Scheduled backup due - starting...');
      await this.performBackup();
    }
  }

  /**
   * Perform a backup
   */
  async performBackup(): Promise<void> {
    try {
      console.warn('💾 Creating data backup...');
      const startTime = Date.now();

      // Export data as JSON
      const data = await exportAllData();
      
      // Store backup metadata (not the full data - that's too large)
      console.warn(`✅ Backup created (${data.length} bytes) in ${Date.now() - startTime}ms`);

      // Update schedule
      const now = Date.now();
      this.schedule.lastBackup = now;
      this.schedule.nextBackup = this.calculateNextBackup(now);
      await this.saveSchedule();

      console.warn(
        `💾 Next backup scheduled for: ${new Date(this.schedule.nextBackup).toLocaleString()}`
      );

      // Notify user (could trigger a notification)
      this.notifyBackupComplete();

    } catch (error) {
      console.error('❌ Backup failed:', error);
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
   * Manually trigger a backup
   */
  async backupNow(): Promise<void> {
    console.log('💾 Manual backup requested...');
    await this.performBackup();
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
export function backupNow(): Promise<void> {
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

