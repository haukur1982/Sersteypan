'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// Types
// =====================================================

export type BatchStatus = 'preparing' | 'checklist' | 'completed' | 'cancelled'

export interface ChecklistItem {
  key: string
  label: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
}

export interface BatchRecord {
  id: string
  project_id: string
  batch_number: string
  batch_date: string
  status: BatchStatus | string
  concrete_slip_url: string | null
  concrete_slip_name: string | null
  concrete_supplier: string | null
  concrete_grade: string | null
  checklist: ChecklistItem[]
  notes: string | null
  air_temperature_c: number | null
  created_by: string
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  project?: { id: string; name: string } | null
  creator?: { id: string; full_name: string } | null
  completer?: { id: string; full_name: string } | null
  elements?: Array<{
    id: string
    name: string
    element_type: string
    status: string | null
    floor: number | null
    weight_kg: number | null
  }>
}

interface CreateBatchData {
  project_id: string
  element_ids: string[]
  concrete_supplier?: string
  concrete_grade?: string
  notes?: string
  air_temperature_c?: number
}

// =====================================================
// Helpers
// =====================================================

/** Verify the current user is admin or factory_manager */
async function requireFactoryAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) throw new Error('Account not active')
  if (!['admin', 'factory_manager'].includes(profile.role)) {
    throw new Error('Insufficient permissions')
  }

  return { supabase, user }
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Create a new production batch.
 *
 * Uses atomic RPC: generate batch number + insert batch + link elements
 * in a single PostgreSQL transaction. Validates elements belong to
 * the project, are unbatched, and in allowed status.
 */
export async function createBatch(data: CreateBatchData) {
  try {
    const { supabase, user } = await requireFactoryAuth()

    if (!data.element_ids || data.element_ids.length === 0) {
      return { error: 'Engar einingar valdar' }
    }

    const { data: result, error: rpcError } = await supabase.rpc('create_batch_with_elements', {
      p_project_id: data.project_id,
      p_element_ids: data.element_ids,
      p_created_by: user.id,
      p_concrete_supplier: data.concrete_supplier || undefined,
      p_concrete_grade: data.concrete_grade || undefined,
      p_notes: data.notes || undefined,
      p_air_temperature_c: data.air_temperature_c ?? undefined,
    })

    if (rpcError) {
      console.error('Error creating batch:', rpcError)
      return { error: rpcError.message }
    }

    const rpcResult = result as { success?: boolean; error?: string; batchId?: string; batchNumber?: string }

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }

    revalidatePath('/factory/batches')
    revalidatePath('/factory/production')
    revalidatePath('/factory')
    return { success: true, batchId: rpcResult.batchId, batchNumber: rpcResult.batchNumber }
  } catch (err) {
    console.error('createBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get a single batch with all related data.
 */
export async function getBatch(batchId: string): Promise<{ data: BatchRecord | null; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: batch, error } = await supabase
      .from('production_batches')
      .select(`
        *,
        project:projects (id, name),
        creator:profiles!production_batches_created_by_fkey (id, full_name),
        completer:profiles!production_batches_completed_by_fkey (id, full_name)
      `)
      .eq('id', batchId)
      .single()

    if (error) {
      console.error('Error fetching batch:', error)
      return { data: null, error: error.message }
    }

    // Fetch elements in this batch
    const { data: elements } = await supabase
      .from('elements')
      .select('id, name, element_type, status, floor, weight_kg')
      .eq('batch_id', batchId)
      .order('name')

    const record: BatchRecord = {
      ...batch,
      checklist: (batch.checklist as unknown as ChecklistItem[]) || [],
      elements: elements || [],
    }

    return { data: record }
  } catch (err) {
    console.error('getBatch error:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get all batches for a project.
 */
export async function getBatchesForProject(projectId: string): Promise<{
  data: BatchRecord[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: batches, error } = await supabase
      .from('production_batches')
      .select(`
        *,
        project:projects (id, name),
        creator:profiles!production_batches_created_by_fkey (id, full_name)
      `)
      .eq('project_id', projectId)
      .order('batch_date', { ascending: false })

    if (error) {
      console.error('Error fetching batches:', error)
      return { data: [], error: error.message }
    }

    // For each batch, get element count
    const batchRecords: BatchRecord[] = await Promise.all(
      (batches || []).map(async (batch) => {
        const { data: elements } = await supabase
          .from('elements')
          .select('id, name, element_type, status, floor, weight_kg')
          .eq('batch_id', batch.id)
          .order('name')

        return {
          ...batch,
          checklist: (batch.checklist as unknown as ChecklistItem[]) || [],
          elements: elements || [],
        }
      })
    )

    return { data: batchRecords }
  } catch (err) {
    console.error('getBatchesForProject error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get all batches across all projects (for the factory batches list page).
 */
export async function getAllBatches(statusFilter?: BatchStatus): Promise<{
  data: BatchRecord[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('production_batches')
      .select(`
        *,
        project:projects (id, name),
        creator:profiles!production_batches_created_by_fkey (id, full_name)
      `)
      .order('batch_date', { ascending: false })
      .limit(100)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: batches, error } = await query

    if (error) {
      console.error('Error fetching all batches:', error)
      return { data: [], error: error.message }
    }

    // Get element counts for each batch
    const batchIds = (batches || []).map((b) => b.id)
    let allElements: Array<{
      id: string
      name: string
      element_type: string
      status: string | null
      floor: number | null
      weight_kg: number | null
      batch_id: string | null
    }> = []

    if (batchIds.length > 0) {
      const { data: elements } = await supabase
        .from('elements')
        .select('id, name, element_type, status, floor, weight_kg, batch_id')
        .in('batch_id', batchIds)
        .order('name')

      allElements = elements || []
    }

    const batchRecords: BatchRecord[] = (batches || []).map((batch) => ({
      ...batch,
      checklist: (batch.checklist as unknown as ChecklistItem[]) || [],
      elements: allElements.filter((e) => e.batch_id === batch.id),
    }))

    return { data: batchRecords }
  } catch (err) {
    console.error('getAllBatches error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get the batch for a specific element (if any).
 */
export async function getBatchForElement(elementId: string): Promise<{
  data: BatchRecord | null
  error?: string
}> {
  try {
    const supabase = await createClient()

    // First get the element's batch_id
    const { data: element, error: elemError } = await supabase
      .from('elements')
      .select('batch_id')
      .eq('id', elementId)
      .single()

    if (elemError || !element?.batch_id) {
      return { data: null }
    }

    return getBatch(element.batch_id)
  } catch (err) {
    console.error('getBatchForElement error:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Update a single checklist item in a batch.
 */
export async function updateChecklistItem(
  batchId: string,
  key: string,
  checked: boolean
) {
  try {
    const { supabase, user } = await requireFactoryAuth()

    // Fetch current checklist
    const { data: batch, error: fetchError } = await supabase
      .from('production_batches')
      .select('checklist, status')
      .eq('id', batchId)
      .single()

    if (fetchError || !batch) {
      return { error: 'Lota finnst ekki' }
    }

    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return { error: 'Ekki er hægt að breyta loku lotu' }
    }

    // Update the specific checklist item
    const checklist = (batch.checklist as unknown as ChecklistItem[]) || []
    const updatedChecklist = checklist.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          checked,
          checked_by: checked ? user.id : null,
          checked_at: checked ? new Date().toISOString() : null,
        }
      }
      return item
    })

    // Determine new status
    const allChecked = updatedChecklist.every((item) => item.checked)
    const newStatus = allChecked ? 'checklist' : 'preparing'

    const { error: updateError } = await supabase
      .from('production_batches')
      .update({
        checklist: JSON.parse(JSON.stringify(updatedChecklist)),
        status: newStatus,
      })
      .eq('id', batchId)

    if (updateError) {
      console.error('Error updating checklist:', updateError)
      return { error: updateError.message }
    }

    revalidatePath(`/factory/batches/${batchId}`)
    revalidatePath('/factory/batches')
    return { success: true }
  } catch (err) {
    console.error('updateChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Complete a batch. Requires ALL checklist items to be checked.
 *
 * 1. Verify checklist is complete
 * 2. Update batch status → 'completed'
 * 3. Advance all batch elements to 'cast' status
 */
export async function completeBatch(batchId: string) {
  try {
    const { supabase, user } = await requireFactoryAuth()

    // Atomic RPC: validates checklist, updates batch status, advances elements
    // All in a single PostgreSQL transaction — no partial completion possible
    const { data: result, error: rpcError } = await supabase.rpc('complete_batch', {
      p_batch_id: batchId,
      p_completed_by: user.id,
    })

    if (rpcError) {
      console.error('Error completing batch:', rpcError)
      return { error: rpcError.message }
    }

    const rpcResult = result as { success?: boolean; error?: string }

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }

    revalidatePath(`/factory/batches/${batchId}`)
    revalidatePath('/factory/batches')
    revalidatePath('/factory/production')
    revalidatePath('/factory')
    return { success: true }
  } catch (err) {
    console.error('completeBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Upload concrete slip document to a batch.
 */
export async function uploadConcreteSlip(batchId: string, formData: FormData) {
  try {
    const { supabase } = await requireFactoryAuth()

    const file = formData.get('file') as File
    if (!file) {
      return { error: 'Engin skrá valin' }
    }

    // Upload to storage
    const fileName = `concrete-slips/${batchId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading concrete slip:', uploadError)
      return { error: 'Villa við að hlaða upp steypuskýrslu' }
    }

    // Store the file path (NOT public URL — bucket is private)
    // Access via /api/batches/[batchId]/concrete-slip proxy
    const { error: updateError } = await supabase
      .from('production_batches')
      .update({
        concrete_slip_url: fileName,
        concrete_slip_name: file.name,
      })
      .eq('id', batchId)

    if (updateError) {
      console.error('Error saving concrete slip URL:', updateError)
      return { error: 'Skrá hlaðin upp en villa við að vista tengil' }
    }

    revalidatePath(`/factory/batches/${batchId}`)
    return { success: true }
  } catch (err) {
    console.error('uploadConcreteSlip error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Update batch metadata (notes, concrete info).
 */
export async function updateBatch(
  batchId: string,
  data: {
    concrete_supplier?: string
    concrete_grade?: string
    notes?: string
    air_temperature_c?: number | null
  }
) {
  try {
    const { supabase } = await requireFactoryAuth()

    const updateData: Record<string, unknown> = {}
    if (data.concrete_supplier !== undefined) updateData.concrete_supplier = data.concrete_supplier || null
    if (data.concrete_grade !== undefined) updateData.concrete_grade = data.concrete_grade || null
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.air_temperature_c !== undefined) updateData.air_temperature_c = data.air_temperature_c

    const { error } = await supabase
      .from('production_batches')
      .update(updateData)
      .eq('id', batchId)

    if (error) {
      console.error('Error updating batch:', error)
      return { error: error.message }
    }

    revalidatePath(`/factory/batches/${batchId}`)
    revalidatePath('/factory/batches')
    return { success: true }
  } catch (err) {
    console.error('updateBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get elements that are not yet assigned to a batch for a project.
 * Used in the BatchCreateDialog to populate the element picker.
 */
export async function getUnbatchedElements(projectId: string) {
  try {
    const supabase = await createClient()

    const { data: elements, error } = await supabase
      .from('elements')
      .select('id, name, element_type, status, floor, weight_kg')
      .eq('project_id', projectId)
      .is('batch_id', null)
      .in('status', ['planned', 'rebar'])
      .order('name')

    if (error) {
      console.error('Error fetching unbatched elements:', error)
      return { data: [], error: error.message }
    }

    return { data: elements || [] }
  } catch (err) {
    console.error('getUnbatchedElements error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}
