'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Group Management ────────────────────────────────────────────────────────

export async function addShiftGroup(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  const name = formData.get('name') as string
  const color = formData.get('color') as string || 'blue'

  if (!name || name.trim().length === 0) {
    return { error: 'Nafn vantar' }
  }

  // Get the next sort_order
  const { data: existing } = await supabase
    .from('shift_groups')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase.from('shift_groups').insert({
    name: name.trim(),
    color,
    sort_order: nextOrder,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Hópur með þessu nafni er þegar til' }
    return { error: error.message }
  }

  revalidatePath('/admin/shifts')
  return { error: '' }
}

export async function deleteShiftGroup(groupId: string): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  const { error } = await supabase.from('shift_groups').delete().eq('id', groupId)
  if (error) return { error: error.message }

  revalidatePath('/admin/shifts')
  return { error: '' }
}

// ─── Member Management ───────────────────────────────────────────────────────

export async function addGroupMember(
  groupId: string,
  displayName: string,
  profileId?: string | null
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  if (!displayName || displayName.trim().length === 0) {
    return { error: 'Nafn vantar' }
  }

  const { error } = await supabase.from('shift_group_members').insert({
    group_id: groupId,
    display_name: displayName.trim(),
    profile_id: profileId || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/shifts')
  return { error: '' }
}

export async function removeGroupMember(memberId: string): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  const { error } = await supabase
    .from('shift_group_members')
    .update({ is_active: false })
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath('/admin/shifts')
  return { error: '' }
}

// ─── Pattern Management ──────────────────────────────────────────────────────

export async function saveShiftPattern(
  startDate: string,
  cycleDays: number,
  pattern: string[][]
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  if (!startDate) return { error: 'Upphafsdagsetning vantar' }
  if (cycleDays < 1 || cycleDays > 365) return { error: 'Ógildur fjöldi daga í lotu' }
  if (pattern.length !== cycleDays) return { error: 'Mynstur stemmir ekki við fjölda daga' }

  // Deactivate all existing patterns
  await supabase
    .from('shift_patterns')
    .update({ is_active: false })
    .eq('is_active', true)

  // Insert new pattern
  const { error } = await supabase.from('shift_patterns').insert({
    start_date: startDate,
    cycle_days: cycleDays,
    pattern: pattern as unknown as string[][],
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/shifts')
  revalidatePath('/admin')
  return { error: '' }
}

// ─── Override Management ─────────────────────────────────────────────────────

export async function createOverride(
  memberId: string,
  overrideDate: string,
  overrideType: string,
  reason?: string
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  const validTypes = ['extra_full', 'extra_half', 'absent', 'half_day']
  if (!validTypes.includes(overrideType)) {
    return { error: 'Ógild tegund undanþágu' }
  }

  const { error } = await supabase.from('shift_overrides').insert({
    member_id: memberId,
    override_date: overrideDate,
    override_type: overrideType,
    reason: reason || null,
    created_by: user.id,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Undanþága er þegar til fyrir þennan dag' }
    return { error: error.message }
  }

  revalidatePath('/admin/shifts')
  revalidatePath('/admin')
  return { error: '' }
}

export async function deleteOverride(overrideId: string): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráð/ur' }

  const { error } = await supabase.from('shift_overrides').delete().eq('id', overrideId)
  if (error) return { error: error.message }

  revalidatePath('/admin/shifts')
  revalidatePath('/admin')
  return { error: '' }
}
