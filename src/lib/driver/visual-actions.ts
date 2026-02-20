'use server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/utils/audit'
import { revalidatePath } from 'next/cache'

export type VerificationStatus = 'verified' | 'rejected'

export interface SaveVisualVerificationInput {
  elementId: string
  status: VerificationStatus
  rejectionReason?: string
  notes?: string
}

export interface SaveVisualVerificationResult {
  success?: boolean
  verificationId?: string
  error?: string
}

/**
 * Save a visual verification result for an element.
 * Called when a driver confirms or rejects an element during the Visual ID flow.
 */
export async function saveVisualVerification(
  input: SaveVisualVerificationInput
): Promise<SaveVisualVerificationResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Þú þarft að vera innskráður. (You must be logged in.)' }
  }

  // Verify user is a driver
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'driver') {
    return { error: 'Aðeins bílstjórar geta staðfest einingar. (Only drivers can verify elements.)' }
  }

  // Validate element exists
  const { data: element, error: elementError } = await supabase
    .from('elements')
    .select('id, name, status')
    .eq('id', input.elementId)
    .single()

  if (elementError || !element) {
    return { error: 'Eining fannst ekki. (Element not found.)' }
  }

  // Validate rejection requires reason
  if (input.status === 'rejected' && !input.rejectionReason) {
    return { error: 'Vinsamlegast gefðu ástæðu fyrir höfnun. (Please provide a rejection reason.)' }
  }

  // Insert verification record
  const { data: verification, error: insertError } = await (supabase as any)
    .from('visual_verifications')
    .insert({
      element_id: input.elementId,
      driver_id: user.id,
      status: input.status,
      rejection_reason: input.rejectionReason || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Visual verification insert error:', insertError)
    return { error: 'Villa við að vista staðfestingu. (Error saving verification.)' }
  }

  // Log to audit trail
  await logAudit({
    tableName: 'visual_verifications',
    recordId: verification.id,
    action: 'create',
    newData: {
      element_id: input.elementId,
      element_name: element.name,
      status: input.status,
      rejection_reason: input.rejectionReason,
    },
  })

  // Revalidate relevant pages
  revalidatePath('/driver/scan')
  revalidatePath(`/driver/visual-id/${input.elementId}`)
  revalidatePath('/driver/load')

  return {
    success: true,
    verificationId: verification.id,
  }
}

/**
 * Get verification history for an element.
 * Useful for admins/factory managers to see verification patterns.
 */
export async function getElementVerifications(elementId: string) {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('visual_verifications')
    .select(`
      id,
      status,
      rejection_reason,
      notes,
      verified_at,
      driver:profiles!driver_id (
        id,
        full_name
      )
    `)
    .eq('element_id', elementId)
    .order('verified_at', { ascending: false })

  if (error) {
    console.error('Error fetching verifications:', error)
    return { data: [], error: error.message }
  }

  return { data, error: null }
}

/**
 * Get recent verifications by a driver.
 * Useful for driver's verification history.
 */
export async function getDriverVerifications(limit = 20) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: 'Not authenticated' }
  }

  const { data, error } = await (supabase as any)
    .from('visual_verifications')
    .select(`
      id,
      status,
      verified_at,
      element:elements!element_id (
        id,
        name,
        element_type,
        project:projects!project_id (
          name
        )
      )
    `)
    .eq('driver_id', user.id)
    .order('verified_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching driver verifications:', error)
    return { data: [], error: error.message }
  }

  return { data, error: null }
}
