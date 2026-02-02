'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { AuthUser, UserPreferences } from '@/lib/providers/AuthProvider'
import { authRateLimiter, getClientIP } from '@/lib/utils/rateLimit'

export async function login(formData: FormData) {
  // Rate limiting for login attempts
  const headersList = await headers()
  const clientIP = getClientIP(headersList)
  const { success: rateLimitOk } = authRateLimiter.check(clientIP)

  if (!rateLimitOk) {
    return { error: 'Of margar tilraunir. Reyndu aftur eftir smá stund. (Too many attempts. Please try again later.)' }
  }

  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Get user profile to determine role
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'User not found' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  // Redirect to role-specific dashboard
  const dashboardMap = {
    admin: '/admin',
    factory_manager: '/factory',
    buyer: '/buyer',
    driver: '/driver',
  }

  const dashboard = dashboardMap[profile.role as keyof typeof dashboardMap] || '/admin'

  revalidatePath('/', 'layout')
  redirect(dashboard)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getUser() {
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
    console.warn('getUser: Profile missing for user', user.id)
    // Attempt self-heal: create a minimal profile if missing.
    const roleCandidates = [
      (user.user_metadata as { role?: string } | undefined)?.role,
      (user.app_metadata as { role?: string } | undefined)?.role,
    ]
    const rawRole = roleCandidates.find((role) => typeof role === 'string')
    const safeRole =
      rawRole && ['admin', 'factory_manager', 'buyer', 'driver'].includes(rawRole)
        ? (rawRole as AuthUser['role'])
        : ('buyer' as AuthUser['role'])
    const fallbackEmail = user.email ?? user.phone ?? 'unknown'
    const fallbackFullName =
      (user.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ??
      (user.user_metadata as { full_name?: string; name?: string } | undefined)?.name ??
      fallbackEmail

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: fallbackEmail,
          full_name: fallbackFullName,
          role: safeRole,
          company_id: null,
          is_active: true,
        },
        { onConflict: 'id' }
      )

    if (!upsertError) {
      const { data: repairedProfile } = await supabase
        .from('profiles')
        .select('full_name, email, role, company_id, preferences')
        .eq('id', user.id)
        .single()

      if (repairedProfile) {
        return {
          id: user.id,
          email: user.email ?? repairedProfile.email,
          fullName: repairedProfile.full_name,
          role: repairedProfile.role as AuthUser['role'],
          companyId: repairedProfile.company_id,
          preferences: (repairedProfile.preferences || {}) as UserPreferences,
        }
      }
    }

    // EMERGENCY FALLBACK: If profile is still missing, return a safe "ghost" user
    // so the sidebar renders and logout works.
    return {
      id: user.id,
      email: user.email ?? fallbackEmail,
      fullName: 'PROFILE MISSING',
      role: 'buyer' as AuthUser['role'],
      companyId: null,
      preferences: {} as UserPreferences,
    }
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
