import { createClient } from '@/lib/supabase/server'
import {
  getScheduledGroupsForDate,
  getTodayISO,
  type DayGroupEntry,
  type ShiftMember,
} from './utils'

export interface ShiftGroupWithMembers {
  id: string
  name: string
  color: string
  sort_order: number
  members: {
    id: string
    display_name: string
    is_active: boolean
    profile_id: string | null
  }[]
}

/**
 * Get all shift groups with their members, ordered by sort_order.
 */
export async function getShiftGroups(): Promise<ShiftGroupWithMembers[]> {
  const supabase = await createClient()

  const { data: groups } = await supabase
    .from('shift_groups')
    .select('id, name, color, sort_order')
    .order('sort_order')

  if (!groups || groups.length === 0) return []

  const { data: members } = await supabase
    .from('shift_group_members')
    .select('id, group_id, display_name, is_active, profile_id')
    .eq('is_active', true)
    .order('display_name')

  return groups.map((g) => ({
    ...g,
    members: (members || []).filter((m) => m.group_id === g.id),
  }))
}

/**
 * Get the currently active shift pattern.
 */
export async function getActivePattern() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('shift_patterns')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  return data
}

/**
 * Get overrides for a date range.
 */
export async function getOverridesForRange(fromDate: string, toDate: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('shift_overrides')
    .select('*, shift_group_members!inner(id, display_name, group_id)')
    .gte('override_date', fromDate)
    .lte('override_date', toDate)
    .order('override_date')

  return data || []
}

/**
 * Get complete shift info for today (used by dashboard widget).
 * Returns today's groups, workers on shift, and any overrides.
 */
export async function getTodayShiftInfo() {
  const today = getTodayISO()

  const [groups, pattern, overrides] = await Promise.all([
    getShiftGroups(),
    getActivePattern(),
    getOverridesForRange(today, today),
  ])

  if (!pattern) {
    return { today, groups: [], todayGroups: [] as DayGroupEntry[], workers: [] as ShiftMember[], overrides: [], hasPattern: false, tomorrow: '' as string, tomorrowGroups: [] as DayGroupEntry[] }
  }

  const patternData = pattern.pattern as string[][]
  const todayGroups = getScheduledGroupsForDate(
    patternData,
    pattern.start_date,
    pattern.cycle_days,
    today
  )

  // Get tomorrow's groups for preview
  const tomorrowDate = new Date(today + 'T00:00:00')
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().split('T')[0]
  const tomorrowGroups = getScheduledGroupsForDate(
    patternData,
    pattern.start_date,
    pattern.cycle_days,
    tomorrow
  )

  // Build worker list for today's groups
  const todayGroupNames = todayGroups.map((g) => g.name)
  const workers: ShiftMember[] = []
  for (const group of groups) {
    if (todayGroupNames.includes(group.name)) {
      for (const member of group.members) {
        workers.push({
          id: member.id,
          display_name: member.display_name,
          group_name: group.name,
          group_color: group.color,
        })
      }
    }
  }

  // Process overrides for today
  const todayOverrides = overrides.map((o) => {
    const member = o.shift_group_members as unknown as { id: string; display_name: string; group_id: string }
    return {
      member_id: member.id,
      display_name: member.display_name,
      override_type: o.override_type,
      reason: o.reason,
    }
  })

  return {
    today,
    groups,
    todayGroups,
    workers,
    overrides: todayOverrides,
    hasPattern: true,
    tomorrow,
    tomorrowGroups,
  }
}

/**
 * Get monthly summary for all workers.
 * Computes regular shifts + overrides for the given month.
 */
export async function getMonthSummary(year: number, month: number) {
  const groups = await getShiftGroups()
  const pattern = await getActivePattern()

  if (!pattern) return []

  const patternData = pattern.pattern as string[][]

  // Get all days in the month
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDayDate = new Date(year, month, 0) // Last day of month
  const lastDay = lastDayDate.toISOString().split('T')[0]

  const overrides = await getOverridesForRange(firstDay, lastDay)

  // Build override lookup: member_id -> date -> override
  const overrideLookup = new Map<string, Map<string, string>>()
  for (const o of overrides) {
    const member = o.shift_group_members as unknown as { id: string }
    if (!overrideLookup.has(member.id)) {
      overrideLookup.set(member.id, new Map())
    }
    overrideLookup.get(member.id)!.set(o.override_date, o.override_type)
  }

  // For each worker, compute their schedule for the month
  const summary: {
    member_id: string
    display_name: string
    group_name: string
    group_color: string
    regular_shifts: number
    extra_full: number
    extra_half: number
    absent: number
    half_days: number
    total_effective: number
  }[] = []

  for (const group of groups) {
    for (const member of group.members) {
      let regularShifts = 0
      let extraFull = 0
      let extraHalf = 0
      let absent = 0
      let halfDays = 0

      // Iterate through each day of the month
      const d = new Date(firstDay + 'T00:00:00')
      while (d <= lastDayDate) {
        const dateStr = d.toISOString().split('T')[0]
        const dayGroups = getScheduledGroupsForDate(patternData, pattern.start_date, pattern.cycle_days, dateStr)
        const isScheduled = dayGroups.some((g) => g.name === group.name)
        const isHalf = dayGroups.some((g) => g.name === group.name && g.isHalf)

        const override = overrideLookup.get(member.id)?.get(dateStr)

        if (override === 'absent') {
          absent++
        } else if (override === 'extra_full') {
          extraFull++
        } else if (override === 'extra_half') {
          extraHalf++
        } else if (override === 'half_day' || isHalf) {
          if (isScheduled) halfDays++
        } else if (isScheduled) {
          regularShifts++
        }

        d.setDate(d.getDate() + 1)
      }

      const totalEffective = regularShifts + extraFull + (halfDays + extraHalf) * 0.5

      summary.push({
        member_id: member.id,
        display_name: member.display_name,
        group_name: group.name,
        group_color: group.color,
        regular_shifts: regularShifts,
        extra_full: extraFull,
        extra_half: extraHalf,
        absent,
        half_days: halfDays,
        total_effective: totalEffective,
      })
    }
  }

  return summary
}
