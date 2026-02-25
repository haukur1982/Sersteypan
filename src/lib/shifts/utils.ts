/**
 * Pure utility functions for shift pattern computation.
 * No database access — all functions take data as arguments.
 */

export interface DayGroupEntry {
  name: string
  isHalf: boolean
}

export interface DaySchedule {
  date: string // YYYY-MM-DD
  groups: DayGroupEntry[]
}

export interface ShiftMember {
  id: string
  display_name: string
  group_name: string
  group_color: string
}

export interface DayRoster extends DaySchedule {
  workers: ShiftMember[]
  overrides: {
    member_id: string
    display_name: string
    override_type: string
    reason: string | null
  }[]
}

// Group color configuration
export const GROUP_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
  green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
}

/**
 * Check if a group entry represents a half day.
 * Convention: "A-" means group A works a half day.
 */
export function isHalfDay(groupEntry: string): boolean {
  return groupEntry.endsWith('-')
}

/**
 * Extract the group name from a pattern entry.
 * "A-" → "A", "B" → "B"
 */
export function getGroupName(groupEntry: string): string {
  return groupEntry.replace(/-$/, '')
}

/**
 * Parse a pattern entry into a DayGroupEntry.
 */
export function parseGroupEntry(entry: string): DayGroupEntry {
  return {
    name: getGroupName(entry),
    isHalf: isHalfDay(entry),
  }
}

/**
 * Get the groups scheduled for a specific date based on the rotation pattern.
 *
 * The pattern repeats every `cycleDays` days starting from `startDate`.
 * pattern[(date - startDate) % cycleDays] gives the groups for that day.
 */
export function getScheduledGroupsForDate(
  pattern: string[][],
  startDate: string,
  cycleDays: number,
  date: string
): DayGroupEntry[] {
  const start = new Date(startDate + 'T00:00:00')
  const target = new Date(date + 'T00:00:00')

  const diffMs = target.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  // JavaScript modulo can be negative for dates before start, normalize it
  const index = ((diffDays % cycleDays) + cycleDays) % cycleDays

  const dayPattern = pattern[index] || []
  return dayPattern.map(parseGroupEntry)
}

/**
 * Get a week's schedule (Mon–Sun) starting from a given date.
 */
export function getWeekSchedule(
  pattern: string[][],
  startDate: string,
  cycleDays: number,
  weekStart: string
): DaySchedule[] {
  const result: DaySchedule[] = []
  const start = new Date(weekStart + 'T00:00:00')

  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      groups: getScheduledGroupsForDate(pattern, startDate, cycleDays, dateStr),
    })
  }

  return result
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getMonday(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay()
  // Sunday = 0, Monday = 1, ..., Saturday = 6
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/**
 * Format a date in Icelandic short format: "mán. 24. feb"
 */
export function formatDateShortIS(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['sun.', 'mán.', 'þri.', 'mið.', 'fim.', 'fös.', 'lau.']
  const months = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.']
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`
}

/**
 * Format a date as just the day name in Icelandic: "mánudagur"
 */
export function formatDayNameIS(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur']
  return days[d.getDay()]
}

/**
 * Get the ISO week number for a date.
 */
export function getISOWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const temp = new Date(d.valueOf())
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7))
  const week1 = new Date(temp.getFullYear(), 0, 4)
  return 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

/**
 * Check if two date strings represent the same day.
 */
export function isSameDay(a: string, b: string): boolean {
  return a === b
}

/**
 * Get all days in a given month as YYYY-MM-DD strings.
 */
export function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    days.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return days
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
export function getTodayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Override type labels in Icelandic.
 */
export const OVERRIDE_TYPE_LABELS: Record<string, { label: string; color: string; shortLabel: string }> = {
  extra_full: { label: 'Auka dagur', color: 'bg-green-100 text-green-800', shortLabel: '+1' },
  extra_half: { label: 'Auka ½ dagur', color: 'bg-green-100 text-green-800', shortLabel: '+½' },
  absent: { label: 'Fjarverandi', color: 'bg-red-100 text-red-800', shortLabel: '✕' },
  half_day: { label: 'Hálfur dagur', color: 'bg-yellow-100 text-yellow-800', shortLabel: '½' },
}
