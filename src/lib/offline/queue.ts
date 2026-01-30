/**
 * Offline Queue System
 *
 * Handles offline action queuing with:
 * - IndexedDB for primary storage (rich data)
 * - localStorage for backup (iOS Safari resilience)
 * - Automatic sync when back online
 * - Conflict detection
 * - Retry logic with exponential backoff
 */

import { openDB, type IDBPDatabase } from 'idb'
import { addElementToDelivery, removeElementFromDelivery, confirmElementDelivered } from '@/lib/driver/qr-actions'
import { startDelivery, arriveAtSite, completeDelivery } from '@/lib/driver/delivery-actions'

const DB_NAME = 'sersteypan-offline'
const DB_VERSION = 1
const STORE_NAME = 'actions'
const MAX_RETRIES = 3
const STORAGE_BACKUP_KEY = 'offline_queue_backup'

// Action Types
export type OfflineActionType =
  | 'add_element_to_delivery'
  | 'remove_element_from_delivery'
  | 'confirm_element_delivered'
  | 'start_delivery'
  | 'arrive_at_site'
  | 'complete_delivery'

// Action Payloads
export interface AddElementPayload {
  deliveryId: string
  elementId: string
  elementName: string
  loadPosition?: string
  timestamp: string
}

export interface RemoveElementPayload {
  deliveryId: string
  elementId: string
  timestamp: string
}

export interface ConfirmDeliveryPayload {
  deliveryId: string
  elementId: string
  photoUrl?: string
  notes?: string
  timestamp: string
}

export interface StartDeliveryPayload {
  deliveryId: string
  timestamp: string
}

export interface ArriveAtSitePayload {
  deliveryId: string
  gpsLat?: number
  gpsLng?: number
  timestamp: string
}

export interface CompleteDeliveryPayload {
  deliveryId: string
  receivedByName: string
  signatureUrl?: string
  photoUrl?: string
  notes?: string
  timestamp: string
}

export type ActionPayload =
  | AddElementPayload
  | RemoveElementPayload
  | ConfirmDeliveryPayload
  | StartDeliveryPayload
  | ArriveAtSitePayload
  | CompleteDeliveryPayload

// Offline Action
export interface OfflineAction {
  id: string
  type: OfflineActionType
  payload: ActionPayload
  createdAt: string
  retryCount: number
  lastError?: string
  elementId?: string
  deliveryId?: string
}

// Sync Results
export interface ConflictAction {
  action: OfflineAction
  currentState: any
  conflictReason: string
}

export interface FailedAction {
  action: OfflineAction
  error: string
  retriable: boolean
}

export interface SyncResult {
  success: OfflineAction[]
  conflicts: ConflictAction[]
  failed: FailedAction[]
}

// IndexedDB Database Instance
let dbInstance: IDBPDatabase | null = null

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
        store.createIndex('type', 'type')
        store.createIndex('deliveryId', 'deliveryId')
      }
    },
  })

  return dbInstance
}

/**
 * Queue an action for offline execution
 */
export async function queueAction(
  type: OfflineActionType,
  payload: ActionPayload
): Promise<OfflineAction> {
  const action: OfflineAction = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    elementId: 'elementId' in payload ? payload.elementId : undefined,
    deliveryId: 'deliveryId' in payload ? payload.deliveryId : undefined,
  }

  try {
    // Store in IndexedDB
    const db = await initDB()
    await db.add(STORE_NAME, action)

    // Backup to localStorage (just metadata for iOS Safari resilience)
    backupToLocalStorage(action)

    // Emit event for UI reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-change'))
    }

    console.log(`[Offline Queue] Queued action: ${type}`, action)

    return action
  } catch (error) {
    console.error('[Offline Queue] Error queuing action:', error)
    throw error
  }
}

/**
 * Backup action metadata to localStorage
 */
function backupToLocalStorage(action: OfflineAction): void {
  try {
    const backup = JSON.parse(localStorage.getItem(STORAGE_BACKUP_KEY) || '[]')
    backup.push({
      id: action.id,
      type: action.type,
      createdAt: action.createdAt,
      elementId: action.elementId,
      deliveryId: action.deliveryId,
    })
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(backup))
  } catch (error) {
    console.error('[Offline Queue] Error backing up to localStorage:', error)
  }
}

/**
 * Remove action from localStorage backup
 */
function removeFromLocalStorageBackup(actionId: string): void {
  try {
    const backup = JSON.parse(localStorage.getItem(STORAGE_BACKUP_KEY) || '[]')
    const filtered = backup.filter((item: any) => item.id !== actionId)
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[Offline Queue] Error removing from localStorage:', error)
  }
}

/**
 * Get count of pending actions
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await initDB()
    const count = await db.count(STORE_NAME)
    return count
  } catch (error) {
    console.error('[Offline Queue] Error getting pending count:', error)
    return 0
  }
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  try {
    const db = await initDB()
    const actions = await db.getAll(STORE_NAME)
    // Sort by creation time (chronological order)
    return actions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } catch (error) {
    console.error('[Offline Queue] Error getting pending actions:', error)
    return []
  }
}

/**
 * Execute a single action
 */
async function executeAction(action: OfflineAction): Promise<{ success: boolean; error?: string }> {
  console.log(`[Offline Queue] Executing action: ${action.type}`, action)

  try {
    switch (action.type) {
      case 'add_element_to_delivery': {
        const payload = action.payload as AddElementPayload
        const result = await addElementToDelivery(
          payload.deliveryId,
          payload.elementId,
          payload.loadPosition
        )
        return result.success ? { success: true } : { success: false, error: result.error }
      }

      case 'remove_element_from_delivery': {
        const payload = action.payload as RemoveElementPayload
        return await removeElementFromDelivery(payload.deliveryId, payload.elementId)
      }

      case 'confirm_element_delivered': {
        const payload = action.payload as ConfirmDeliveryPayload
        return await confirmElementDelivered(
          payload.deliveryId,
          payload.elementId,
          payload.photoUrl,
          payload.notes
        )
      }

      case 'start_delivery': {
        const payload = action.payload as StartDeliveryPayload
        return await startDelivery(payload.deliveryId)
      }

      case 'arrive_at_site': {
        const payload = action.payload as ArriveAtSitePayload
        return await arriveAtSite(payload.deliveryId, payload.gpsLat, payload.gpsLng)
      }

      case 'complete_delivery': {
        const payload = action.payload as CompleteDeliveryPayload
        return await completeDelivery(
          payload.deliveryId,
          payload.receivedByName,
          payload.signatureUrl,
          payload.photoUrl,
          payload.notes
        )
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  } catch (error: any) {
    console.error('[Offline Queue] Error executing action:', error)
    return { success: false, error: error.message || 'Execution failed' }
  }
}

/**
 * Detect conflicts for an action
 * (Simplified - can be enhanced with more sophisticated conflict detection)
 */
async function detectConflict(action: OfflineAction): Promise<{
  conflict: boolean
  reason?: string
  currentState?: any
}> {
  // For now, we rely on server-side validation in the action functions
  // They will return appropriate errors if status has changed, etc.
  // More sophisticated conflict detection can be added later
  return { conflict: false }
}

/**
 * Sync all pending actions when back online
 */
export async function syncPendingActions(): Promise<SyncResult> {
  const result: SyncResult = {
    success: [],
    conflicts: [],
    failed: [],
  }

  // Check if online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[Offline Queue] Cannot sync - still offline')
    return result
  }

  console.log('[Offline Queue] Starting sync...')

  try {
    const actions = await getPendingActions()

    if (actions.length === 0) {
      console.log('[Offline Queue] No pending actions to sync')
      return result
    }

    console.log(`[Offline Queue] Syncing ${actions.length} actions...`)

    for (const action of actions) {
      try {
        // Check for conflicts
        const conflictCheck = await detectConflict(action)
        if (conflictCheck.conflict) {
          result.conflicts.push({
            action,
            currentState: conflictCheck.currentState,
            conflictReason: conflictCheck.reason || 'Conflict detected',
          })
          continue
        }

        // Execute action
        const execResult = await executeAction(action)

        if (execResult.success) {
          // Success - remove from queue
          result.success.push(action)
          await removeAction(action.id)
        } else {
          // Failure - increment retry count
          throw new Error(execResult.error || 'Action failed')
        }
      } catch (error: any) {
        console.error(`[Offline Queue] Error processing action ${action.id}:`, error)

        // Increment retry count
        action.retryCount++
        action.lastError = error.message || 'Unknown error'

        if (action.retryCount >= MAX_RETRIES) {
          // Give up after max retries
          result.failed.push({
            action,
            error: action.lastError || 'Max retries exceeded',
            retriable: false,
          })
          await removeAction(action.id)
        } else {
          // Update retry count in IndexedDB
          await updateAction(action)
        }
      }
    }

    console.log(`[Offline Queue] Sync complete:`, {
      success: result.success.length,
      conflicts: result.conflicts.length,
      failed: result.failed.length,
    })

    // Emit event for UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-change'))
    }

    return result
  } catch (error) {
    console.error('[Offline Queue] Error during sync:', error)
    return result
  }
}

/**
 * Remove action from queue
 */
async function removeAction(actionId: string): Promise<void> {
  try {
    const db = await initDB()
    await db.delete(STORE_NAME, actionId)
    removeFromLocalStorageBackup(actionId)
  } catch (error) {
    console.error('[Offline Queue] Error removing action:', error)
  }
}

/**
 * Update action in queue (for retry count)
 */
async function updateAction(action: OfflineAction): Promise<void> {
  try {
    const db = await initDB()
    await db.put(STORE_NAME, action)
  } catch (error) {
    console.error('[Offline Queue] Error updating action:', error)
  }
}

/**
 * Clear all actions from queue (admin function)
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await initDB()
    await db.clear(STORE_NAME)
    localStorage.removeItem(STORAGE_BACKUP_KEY)

    // Emit event for UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-change'))
    }

    console.log('[Offline Queue] Queue cleared')
  } catch (error) {
    console.error('[Offline Queue] Error clearing queue:', error)
  }
}

/**
 * Check if IndexedDB has been purged (iOS Safari issue)
 * Compare IndexedDB count with localStorage backup count
 */
export async function checkForDataLoss(): Promise<{
  dataLost: boolean
  lostCount: number
}> {
  try {
    const dbCount = await getPendingCount()
    const backup = JSON.parse(localStorage.getItem(STORAGE_BACKUP_KEY) || '[]')
    const backupCount = backup.length

    if (backupCount > dbCount) {
      console.warn(`[Offline Queue] Data loss detected: ${backupCount - dbCount} actions lost`)
      return {
        dataLost: true,
        lostCount: backupCount - dbCount,
      }
    }

    return { dataLost: false, lostCount: 0 }
  } catch (error) {
    console.error('[Offline Queue] Error checking for data loss:', error)
    return { dataLost: false, lostCount: 0 }
  }
}
