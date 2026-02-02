import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLogEntry {
  tableName: string
  recordId: string
  action: AuditAction
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  changedFields?: string[]
}

/**
 * Log an action to the audit_log table.
 * Call this after successful mutations to track changes.
 *
 * @example
 * // After creating an element
 * await logAudit({
 *   tableName: 'elements',
 *   recordId: element.id,
 *   action: 'create',
 *   newData: element,
 * })
 *
 * @example
 * // After updating an element status
 * await logAudit({
 *   tableName: 'elements',
 *   recordId: elementId,
 *   action: 'update',
 *   oldData: { status: 'cast' },
 *   newData: { status: 'curing' },
 *   changedFields: ['status'],
 * })
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current user info
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let userRole: string | null = null

    if (user) {
      // Fetch user role from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      userRole = profile?.role || null
    }

    // Insert audit log entry
    const auditEntry: AuditLogInsert = {
      table_name: entry.tableName,
      record_id: entry.recordId,
      action: entry.action,
      old_data: (entry.oldData || null) as AuditLogInsert['old_data'],
      new_data: (entry.newData || null) as AuditLogInsert['new_data'],
      changed_fields: entry.changedFields || null,
      changed_by: user?.id || null,
      changed_by_role: userRole,
    }

    const { error } = await supabase.from('audit_log').insert(auditEntry)

    if (error) {
      // Log error but don't throw - audit logging should not break the app
      console.error('Audit log error:', error)
    }
  } catch (error) {
    // Silently fail - audit logging should not break the main operation
    console.error('Audit log exception:', error)
  }
}

/**
 * Calculate which fields changed between two objects.
 * Useful for tracking specific field changes in update operations.
 */
export function getChangedFields(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): string[] {
  const changedFields: string[] = []

  // Check all keys in newData
  for (const key of Object.keys(newData)) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changedFields.push(key)
    }
  }

  // Check for deleted keys (in oldData but not in newData)
  for (const key of Object.keys(oldData)) {
    if (!(key in newData) && !changedFields.includes(key)) {
      changedFields.push(key)
    }
  }

  return changedFields
}

/**
 * Higher-order function to wrap a mutation with audit logging.
 * Automatically logs the action after successful completion.
 *
 * @example
 * const updateWithAudit = withAuditLog(
 *   async (id, data) => updateElement(id, data),
 *   { tableName: 'elements', action: 'update' }
 * )
 */
export function withAuditLog<T extends (...args: unknown[]) => Promise<{ data?: { id: string }; error?: unknown }>>(
  fn: T,
  config: { tableName: string; action: AuditAction }
): T {
  return (async (...args: Parameters<T>) => {
    const result = await fn(...args)

    if (!result.error && result.data?.id) {
      await logAudit({
        tableName: config.tableName,
        recordId: result.data.id,
        action: config.action,
        newData: result.data as Record<string, unknown>,
      })
    }

    return result
  }) as T
}
