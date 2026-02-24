'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Start rebar work on an element (planned → rebar).
 * Only allowed for rebar_worker and admin roles.
 */
export async function startRebarWork(elementId: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!UUID_REGEX.test(elementId)) {
    return { success: false, error: 'Ógilt auðkenni einingar' }
  }

  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Ekki innskráður' }
  }

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager', 'rebar_worker'].includes(profile.role)) {
    return { success: false, error: 'Aðgangur bannaður' }
  }

  // Verify element is in 'planned' status
  const { data: element, error: fetchError } = await supabase
    .from('elements')
    .select('id, status, project_id')
    .eq('id', elementId)
    .single()

  if (fetchError || !element) {
    return { success: false, error: 'Eining fannst ekki' }
  }

  if (element.status !== 'planned') {
    return { success: false, error: 'Eining er ekki í stöðunni "Skipulögð" — ekki hægt að hefja járnabindingu' }
  }

  // Update status to 'rebar'
  const { error: updateError } = await supabase
    .from('elements')
    .update({ status: 'rebar', updated_at: new Date().toISOString() })
    .eq('id', elementId)

  if (updateError) {
    console.error('Error starting rebar work:', updateError)
    return { success: false, error: 'Villa við að uppfæra stöðu' }
  }

  revalidatePath('/rebar')
  revalidatePath(`/rebar/element/${elementId}`)
  revalidatePath(`/rebar/projects/${element.project_id}`)

  return { success: true }
}

/**
 * Mark rebar work as complete on an element.
 * Sets rebar_completed_at timestamp. Does NOT advance status to 'cast' —
 * that's the factory manager's job.
 */
export async function markRebarComplete(elementId: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!UUID_REGEX.test(elementId)) {
    return { success: false, error: 'Ógilt auðkenni einingar' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Ekki innskráður' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager', 'rebar_worker'].includes(profile.role)) {
    return { success: false, error: 'Aðgangur bannaður' }
  }

  // Verify element is in 'rebar' status
  const { data: element, error: fetchError } = await supabase
    .from('elements')
    .select('id, status, project_id')
    .eq('id', elementId)
    .single()

  if (fetchError || !element) {
    return { success: false, error: 'Eining fannst ekki' }
  }

  if (element.status !== 'rebar') {
    return { success: false, error: 'Eining er ekki í járnabindingu' }
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('elements')
    .update({
      rebar_completed_at: now,
      updated_at: now,
    })
    .eq('id', elementId)

  if (updateError) {
    console.error('Error marking rebar complete:', updateError)
    return { success: false, error: 'Villa við að skrá járnabindingu lokið' }
  }

  revalidatePath('/rebar')
  revalidatePath(`/rebar/element/${elementId}`)
  revalidatePath(`/rebar/projects/${element.project_id}`)

  return { success: true }
}

/**
 * Update a single checklist item on an element.
 * Used by rebar workers to check off rebar-related items.
 */
export async function updateChecklistItem(
  elementId: string,
  itemKey: string,
  checked: boolean
): Promise<{
  success: boolean
  error?: string
}> {
  if (!UUID_REGEX.test(elementId)) {
    return { success: false, error: 'Ógilt auðkenni einingar' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Ekki innskráður' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager', 'rebar_worker'].includes(profile.role)) {
    return { success: false, error: 'Aðgangur bannaður' }
  }

  // Fetch current checklist
  const { data: element, error: fetchError } = await supabase
    .from('elements')
    .select('id, checklist, project_id')
    .eq('id', elementId)
    .single()

  if (fetchError || !element) {
    return { success: false, error: 'Eining fannst ekki' }
  }

  // Update the specific checklist item
  const checklist = (element.checklist as unknown as ChecklistItem[]) || []
  const updatedChecklist = checklist.map((item) => {
    if (item.key === itemKey) {
      return {
        ...item,
        checked,
        checked_by: checked ? profile.full_name : null,
        checked_at: checked ? new Date().toISOString() : null,
      }
    }
    return item
  })

  const { error: updateError } = await supabase
    .from('elements')
    .update({
      checklist: updatedChecklist as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', elementId)

  if (updateError) {
    console.error('Error updating checklist:', updateError)
    return { success: false, error: 'Villa við að uppfæra gátlista' }
  }

  revalidatePath(`/rebar/element/${elementId}`)
  revalidatePath(`/rebar/projects/${element.project_id}`)

  return { success: true }
}

/**
 * Rebar QR lookup — similar to factory scan but restricted to rebar_worker role.
 * Supports /qr/{uuid}, /element/{uuid}, or raw UUID.
 */
export async function rebarLookupElementByQR(qrContent: string): Promise<{
  element: {
    id: string
    name: string
    element_type: string
    status: string | null
    project_id: string
    rebar_spec: string | null
    project: { id: string; name: string } | null
  } | null
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { element: null, error: 'Ekki innskráður' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager', 'rebar_worker'].includes(profile.role)) {
    return { element: null, error: 'Aðgangur bannaður' }
  }

  // Parse QR content — supports /qr/{uuid}, /element/{uuid}, or raw UUID
  let elementId: string

  if (qrContent.includes('/qr/') || qrContent.includes('/element/')) {
    const parts = qrContent.split(/\/(?:qr|element)\//)
    elementId = parts[parts.length - 1].split('?')[0].split('#')[0]
  } else {
    elementId = qrContent.trim()
  }

  const isUuid = UUID_REGEX.test(elementId)

  try {
    let query = supabase
      .from('elements')
      .select(`
        id,
        name,
        element_type,
        status,
        project_id,
        rebar_spec,
        project:projects(id, name)
      `)

    if (isUuid) {
      query = query.eq('id', elementId)
    } else {
      query = query.ilike('name', elementId)
    }

    const { data: elements, error } = await query

    if (error || !elements || elements.length === 0) {
      return { element: null, error: 'Eining fannst ekki. Athugaðu QR kóðann.' }
    }

    // Normalize project join (array vs object)
    const raw = elements[0]
    const project = Array.isArray(raw.project) ? raw.project[0] : raw.project

    return {
      element: {
        ...raw,
        project: project ?? null,
      },
    }
  } catch (err) {
    console.error('Rebar QR lookup error:', err)
    return { element: null, error: 'Óvænt villa kom upp' }
  }
}

// Checklist item type for internal use
interface ChecklistItem {
  key: string
  label: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
}
