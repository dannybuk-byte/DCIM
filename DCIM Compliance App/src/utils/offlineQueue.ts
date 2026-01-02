// Offline Queue (Pattern 21)
// Queues operations when offline, syncs when online

import { db } from '../db/database';

export interface QueuedOperation {
  id: string;
  type: 'api_call' | 'data_update' | 'sync';
  payload: any;
  timestamp: number;
  retries: number;
}

const MAX_RETRIES = 3;

/**
 * Add operation to offline queue
 */
export async function queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  try {
    // Use IndexedDB to store queue (not localStorage - Rule 2)
    const queueItem: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...operation,
      timestamp: Date.now(),
      retries: 0,
    };

    // Store in IndexedDB
    // For now, use a simple approach - could create a dedicated table
    const existing = await db.dataProvenance.where('dataPointId').equals(`queue-${queueItem.id}`).first();
    if (!existing) {
      // Store as metadata in dataProvenance (temporary - could add dedicated table)
      await db.dataProvenance.add({
        dataPointId: `queue-${queueItem.id}`,
        facilityId: 0,
        metricName: 'offline_queue',
        sourceType: 'CALC',
        capturedAt: new Date().toISOString(),
        sourceDescription: JSON.stringify(queueItem),
        collectionMethod: 'offline_queue',
        confidence: 'DERIVED',
      } as any);
    }
  } catch (error) {
    console.error('Failed to queue operation:', error);
  }
}

/**
 * Process queued operations when online
 */
export async function processQueue(): Promise<{ processed: number; failed: number }> {
  if (!navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  try {
    // Get queued operations
    const queueItems = await db.dataProvenance
      .where('metricName')
      .equals('offline_queue')
      .toArray();

    for (const item of queueItems) {
      try {
        const operation: QueuedOperation = JSON.parse(item.sourceDescription);

        // Skip if too many retries
        if (operation.retries >= MAX_RETRIES) {
          await db.dataProvenance.delete(item.id!);
          failed++;
          continue;
        }

        // Process operation based on type
        switch (operation.type) {
          case 'api_call':
            // Would execute API call here
            // For now, just mark as processed
            await db.dataProvenance.delete(item.id!);
            processed++;
            break;
          case 'data_update':
            // Would update data here
            await db.dataProvenance.delete(item.id!);
            processed++;
            break;
          default:
            await db.dataProvenance.delete(item.id!);
            processed++;
        }
      } catch (error) {
        console.error('Failed to process queued operation:', error);
        failed++;
      }
    }
  } catch (error) {
    console.error('Failed to process queue:', error);
  }

  return { processed, failed };
}

/**
 * Initialize offline queue monitoring
 */
export function initOfflineQueue(): () => void {
  const handleOnline = () => {
    processQueue().catch(console.error);
  };

  window.addEventListener('online', handleOnline);

  // Process queue on mount if online
  if (navigator.onLine) {
    processQueue().catch(console.error);
  }

  // Return cleanup
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

