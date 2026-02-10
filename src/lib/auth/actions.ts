'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { AuthUser, UserPreferences } from '@/lib/providers/AuthProvider'
import { authRateLimiter, getClientIP } from '@/lib/utils/rateLimit'

function safeRedirectPath(path: unknown): string | null {
  if (typeof path !== 'string') return null
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  return trimmed
}

export async function login(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  // Rate limiting for login attempts
  const headersList = await headers()
  const clientIP = getClientIP(headersList)
  const { success: rateLimitOk } = await authRateLimiter.check(clientIP)

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
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut()
    return { error: 'Account is inactive. Contact an administrator.' }
  }

  // Redirect to role-specific dashboard
  const dashboardMap = {
    admin: '/admin',
    factory_manager: '/factory',
    buyer: '/buyer',
    driver: '/driver',
  }

  const dashboard = dashboardMap[profile.role as keyof typeof dashboardMap] || '/admin'

  // Optional: honor redirectTo (only within allowed portals)
  const redirectTo = safeRedirectPath(formData.get('redirectTo'))
  if (redirectTo) {
    const rolePortalAccess: Record<string, string[]> = {
      admin: ['/admin', '/factory', '/buyer', '/driver'],
      factory_manager: ['/factory'],
      buyer: ['/buyer'],
      driver: ['/driver'],
    }
    const allowed = rolePortalAccess[profile.role as keyof typeof rolePortalAccess] || []
    if (allowed.some((p) => redirectTo.startsWith(p))) {
      revalidatePath('/', 'layout')
      redirect(redirectTo)
    }
  }

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
    .select('full_name, email, role, company_id, preferences, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active === false) {
    console.error('getUser: Profile missing for user', user.id)
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
