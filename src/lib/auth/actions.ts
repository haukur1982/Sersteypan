'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
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
    .select('full_name, email, role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  return {
    id: user.id,
    email: user.email!,
    fullName: profile.full_name,
    role: profile.role,
    companyId: profile.company_id,
  }
}
