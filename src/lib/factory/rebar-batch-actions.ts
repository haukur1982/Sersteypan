'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// Types
// =====================================================

export type RebarBatchStatus = 'preparing' | 'qc_ready' | 'approved' | 'cancelled'

export interface RebarChecklistItem {
  key: string
  label: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
}

export interface RebarBatchRecord {
  id: string
  project_id: string
  batch_number: string
  batch_date: string
  status: RebarBatchStatus | string
  checklist: RebarChecklistItem[]
  notes: string | null
  created_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  project?: {
    id: string
    name: string
    address?: string | null
    companies?: { name: string } | null
  } | null
  creator?: { id: string; full_name: string } | null
  approver?: { id: string; full_name: string } | null
  elements?: Array<{
    id: string
    name: string
    element_type: string
    status: string | null
    floor: number | null
    weight_kg: number | null
    length_mm?: number | null
    width_mm?: number | null
    height_mm?: number | null
    rebar_spec?: string | null
    batch_id?: string | null
    batch_number?: string | null
  }>
}

interface CreateRebarBatchData {
  project_id: string
  element_ids: string[]
  notes?: string
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
 * Create a new rebar batch.
 *
 * Uses atomic RPC: generate batch number + insert batch + link elements
 * in a single PostgreSQL transaction.
 */
export async function createRebarBatch(data: CreateRebarBatchData) {
  try {
    const { supabase, user } = await requireFactoryAuth()

    if (!data.element_ids || data.element_ids.length === 0) {
      return { error: 'Engar einingar valdar' }
    }

    const { data: result, error: rpcError } = await supabase.rpc('create_rebar_batch_with_elements', {
      p_project_id: data.project_id,
      p_element_ids: data.element_ids,
      p_created_by: user.id,
      p_notes: data.notes || undefined,
    })

    if (rpcError) {
      console.error('Error creating rebar batch:', rpcError)
      return { error: rpcError.message }
    }

    const rpcResult = result as { success?: boolean; error?: string; batchId?: string; batchNumber?: string }

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }

    revalidatePath('/factory/rebar')
    revalidatePath('/factory/production')
    revalidatePath('/factory')
    return { success: true, batchId: rpcResult.batchId, batchNumber: rpcResult.batchNumber }
  } catch (err) {
    console.error('createRebarBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get a single rebar batch with all related data.
 */
export async function getRebarBatch(batchId: string): Promise<{ data: RebarBatchRecord | null; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: batch, error } = await supabase
      .from('rebar_batches')
      .select(`
        id,
        project_id,
        batch_number,
        batch_date,
        status,
        checklist,
        notes,
        created_at,
        updated_at,
        created_by,
        approved_by,
        creator:profiles!rebar_batches_created_by_fkey (
          id,
          full_name
        ),
        approver:profiles!rebar_batches_approved_by_fkey (
          id,
          full_name
        ),
        approved_at,
        project:projects (
          id,
          name,
          address,
          companies (
            name
          )
        )
      `)
      .eq('id', batchId)
      .single()

    if (error) {
      console.error('Error fetching rebar batch:', error)
      return { data: null, error: error.message }
    }

    // Fetch elements in this rebar batch
    const { data: elements } = await supabase
      .from('elements')
      .select('id, name, element_type, status, floor, weight_kg, length_mm, width_mm, height_mm, rebar_spec, rebar_batch_id, rebar_batch_number')
      .eq('rebar_batch_id', batchId)
      .order('name')

    const mappedElements = (elements || []).map(el => ({
      ...el,
      batch_id: el.rebar_batch_id,
      batch_number: el.rebar_batch_number
    })) as typeof elements & { batch_id: string | null; batch_number: string | null }[]

    const record: RebarBatchRecord = {
      ...batch,
      checklist: (batch.checklist as unknown as RebarChecklistItem[]) || [],
      elements: mappedElements,
    }

    return { data: record }
  } catch (err) {
    console.error('getRebarBatch error:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get all rebar batches across all projects.
 */
export async function getAllRebarBatches(statusFilter?: RebarBatchStatus): Promise<{
  data: RebarBatchRecord[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('rebar_batches')
      .select(`
        *,
        project:projects (id, name),
        creator:profiles!rebar_batches_created_by_fkey (id, full_name)
      `)
      .order('batch_date', { ascending: false })
      .limit(100)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: batches, error } = await query

    if (error) {
      console.error('Error fetching all rebar batches:', error)
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
      rebar_batch_id: string | null
    }> = []

    if (batchIds.length > 0) {
      const { data: elements } = await supabase
        .from('elements')
        .select('id, name, element_type, status, floor, weight_kg, rebar_batch_id')
        .in('rebar_batch_id', batchIds)
        .order('name')

      allElements = elements || []
    }

    const batchRecords: RebarBatchRecord[] = (batches || []).map((batch) => ({
      ...batch,
      checklist: (batch.checklist as unknown as RebarChecklistItem[]) || [],
      elements: allElements.filter((e) => e.rebar_batch_id === batch.id),
    }))

    return { data: batchRecords }
  } catch (err) {
    console.error('getAllRebarBatches error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get rebar batches for a specific project.
 */
export async function getRebarBatchesForProject(projectId: string): Promise<{
  data: RebarBatchRecord[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: batches, error } = await supabase
      .from('rebar_batches')
      .select(`
        *,
        project:projects (id, name),
        creator:profiles!rebar_batches_created_by_fkey (id, full_name)
      `)
      .eq('project_id', projectId)
      .order('batch_date', { ascending: false })

    if (error) {
      console.error('Error fetching rebar batches for project:', error)
      return { data: [], error: error.message }
    }

    const batchRecords: RebarBatchRecord[] = await Promise.all(
      (batches || []).map(async (batch) => {
        const { data: elements } = await supabase
          .from('elements')
          .select('id, name, element_type, status, floor, weight_kg')
          .eq('rebar_batch_id', batch.id)
          .order('name')

        return {
          ...batch,
          checklist: (batch.checklist as unknown as RebarChecklistItem[]) || [],
          elements: elements || [],
        }
      })
    )

    return { data: batchRecords }
  } catch (err) {
    console.error('getRebarBatchesForProject error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Update a single checklist item in a rebar batch.
 */
export async function updateRebarChecklistItem(
  batchId: string,
  key: string,
  checked: boolean
) {
  try {
    const { supabase, user } = await requireFactoryAuth()

    // Fetch current checklist
    const { data: batch, error: fetchError } = await supabase
      .from('rebar_batches')
      .select('checklist, status')
      .eq('id', batchId)
      .single()

    if (fetchError || !batch) {
      return { error: 'Járnalota finnst ekki' }
    }

    if (batch.status === 'approved' || batch.status === 'cancelled') {
      return { error: 'Ekki er hægt að breyta lokuðri lotu' }
    }

    // Update the specific checklist item
    const checklist = (batch.checklist as unknown as RebarChecklistItem[]) || []
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
    const newStatus = allChecked ? 'qc_ready' : 'preparing'

    const { error: updateError } = await supabase
      .from('rebar_batches')
      .update({
        checklist: JSON.parse(JSON.stringify(updatedChecklist)),
        status: newStatus,
      })
      .eq('id', batchId)

    if (updateError) {
      console.error('Error updating rebar checklist:', updateError)
      return { error: updateError.message }
    }

    revalidatePath(`/factory/rebar/${batchId}`)
    revalidatePath('/factory/rebar')
    return { success: true }
  } catch (err) {
    console.error('updateRebarChecklistItem error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Approve a rebar batch. Requires ALL checklist items to be checked.
 * Advances all batch elements to 'rebar' status.
 */
export async function approveRebarBatch(batchId: string) {
  try {
    const { supabase, user } = await requireFactoryAuth()

    const { data: result, error: rpcError } = await supabase.rpc('approve_rebar_batch', {
      p_batch_id: batchId,
      p_approved_by: user.id,
    })

    if (rpcError) {
      console.error('Error approving rebar batch:', rpcError)
      return { error: rpcError.message }
    }

    const rpcResult = result as { success?: boolean; error?: string }

    if (rpcResult.error) {
      return { error: rpcResult.error }
    }

    revalidatePath(`/factory/rebar/${batchId}`)
    revalidatePath('/factory/rebar')
    revalidatePath('/factory/rebar/stockpile')
    revalidatePath('/factory/production')
    revalidatePath('/factory')
    return { success: true }
  } catch (err) {
    console.error('approveRebarBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get elements that can be added to a rebar batch for a project.
 * Only elements in 'planned' status with no rebar_batch_id.
 */
export async function getRebarUnbatchedElements(projectId: string) {
  try {
    const supabase = await createClient()

    const { data: elements, error } = await supabase
      .from('elements')
      .select('id, name, element_type, status, floor, weight_kg')
      .eq('project_id', projectId)
      .is('rebar_batch_id', null)
      .eq('status', 'planned')
      .order('name')

    if (error) {
      console.error('Error fetching rebar unbatched elements:', error)
      return { data: [], error: error.message }
    }

    return { data: elements || [] }
  } catch (err) {
    console.error('getRebarUnbatchedElements error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Get stockpile data: elements in 'rebar' status grouped by type and project.
 * These are elements that have been rebar-prepped but not yet cast.
 */
export async function getRebarStockpile() {
  try {
    const supabase = await createClient()

    const { data: elements, error } = await supabase
      .from('elements')
      .select(`
        id, name, element_type, status, floor, weight_kg,
        rebar_batch_id, rebar_batch_number,
        batch_id,
        project:projects (id, name)
      `)
      .eq('status', 'rebar')
      .is('batch_id', null)
      .order('element_type')
      .order('name')

    if (error) {
      console.error('Error fetching rebar stockpile:', error)
      return { data: [], error: error.message }
    }

    return { data: elements || [] }
  } catch (err) {
    console.error('getRebarStockpile error:', err)
    return { data: [], error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Remove an individual element from a rebar batch
 */
export async function removeElementFromRebarBatch(elementId: string, batchId: string) {
  try {
    const supabase = await createClient()

    // First, verify the batch is editable
    const { data: batch, error: batchError } = await supabase
      .from('rebar_batches')
      .select('status')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      throw new Error('Járnalota fannst ekki')
    }

    if (batch.status === 'approved' || batch.status === 'cancelled') {
      throw new Error('Ekki er hægt að breyta samþykktri eða afturkallaðri lotu')
    }

    // Unlink the element
    const { error: updateError } = await supabase
      .from('elements')
      .update({
        rebar_batch_id: null,
        rebar_batch_number: null,
      })
      .eq('id', elementId)
      .eq('rebar_batch_id', batchId)

    if (updateError) {
      throw updateError
    }

    revalidatePath('/factory')
    return { success: true }
  } catch (err) {
    console.error('removeElementFromRebarBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}

/**
 * Cancel a rebar batch and detach its elements
 */
export async function cancelRebarBatch(batchId: string) {
  try {
    const supabase = await createClient()

    // Call the RPC to atomic cancel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const { data: _rpcResult, error: rpcError } = await (supabase.rpc as any)('cancel_rebar_batch', {
      p_batch_id: batchId,
    })

    if (rpcError) {
      throw rpcError
    }

    revalidatePath('/factory')
    return { success: true }
  } catch (err) {
    console.error('cancelRebarBatch error:', err)
    return { error: err instanceof Error ? err.message : 'Óvænt villa' }
  }
}
