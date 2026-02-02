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
    // EMERGENCY FALLBACK: If profile is missing/locked (RLS), return a temporary "Ghost" user
    // so the sidebar still renders and allows navigation/logout.
    return {
      id: user.id,
      email: user.email!,
      fullName: 'GHOST USER (Profile Missing)',
      role: 'admin', // Defaulting to admin for this dev user to recover system
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
