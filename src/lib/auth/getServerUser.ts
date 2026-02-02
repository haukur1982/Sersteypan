import { createClient } from '@/lib/supabase/server'
import type { AuthUser, UserPreferences } from '@/lib/providers/AuthProvider'

/**
 * Server-only utility to fetch the current user.
 * Use this in Server Components and layouts.
 * For Server Actions (form submissions), use getUser from actions.ts
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, company_id, preferences')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  return {
    id: user.id,
    email: user.email!,
    fullName: profile.full_name,
    role: profile.role as AuthUser['role'],
    companyId: profile.company_id,
    preferences: (profile.preferences || {}) as UserPreferences,
  }
}
