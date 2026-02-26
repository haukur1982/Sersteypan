'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'

/**
 * Update notification preferences for the current user.
 *
 * Stores preferences in the profiles.preferences JSONB column
 * under the "notifications" key, preserving other preference data.
 *
 * Uses the (prevState, formData) signature for useActionState.
 */
export async function updateNotificationPreferences(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Ekki innskráður', success: false }
  }

  // Parse switch values from form data
  // Switches that are checked send "on", unchecked don't appear at all
  const keys = [
    'element_status',
    'delivery_status',
    'new_message',
    'priority_request',
    'fix_in_factory',
    'toast_enabled',
    'sound_enabled',
  ]

  const newNotifPrefs: Record<string, boolean> = {}
  for (const key of keys) {
    const value = formData.get(key)
    newNotifPrefs[key] = value === 'on' || value === 'true'
  }

  // Fetch current preferences to merge (don't overwrite other pref keys)
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single()

  if (fetchError || !profile) {
    return { error: 'Villa við að sækja prófíl', success: false }
  }

  const currentPrefs = (profile.preferences || {}) as { [key: string]: Json | undefined }
  const updatedPrefs: { [key: string]: Json | undefined } = {
    ...currentPrefs,
    notifications: newNotifPrefs as unknown as Json,
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      preferences: updatedPrefs,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    return { error: 'Villa við að vista stillingar', success: false }
  }

  // Revalidate so AuthProvider picks up the new preferences
  revalidatePath('/')

  return { error: '', success: true }
}
