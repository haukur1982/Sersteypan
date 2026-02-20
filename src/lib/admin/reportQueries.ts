'use server'

import { createClient } from '@/lib/supabase/server'

// ============================================================
// Types
// ============================================================

export interface DateRange {
  from: string // ISO string
  to: string   // ISO string
}

export interface WeeklyCount {
  week: string      // Display label, e.g. "3. feb"
  weekStart: string // ISO date
  count: number
}

export interface CycleTimeStage {
  stage: string       // Icelandic label
  stageKey: string    // e.g. "planned_to_rebar"
  avgHours: number
  sampleSize: number
}

export interface ElementTypeCount {
  type: string    // element_type key
  label: string   // Icelandic label
  count: number
  color: string
}

export interface DeliveryStats {
  totalDeliveries: number
  completedDeliveries: number
  onTimeCount: number
  onTimePercent: number
  avgDurationHours: number
  weeklyTrend: WeeklyCount[]
}

export interface QualityStats {
  totalDefects: number
  defectRate: number
  deliveryImpactCount: number
  deliveryImpactPercent: number
  verificationTotal: number
  verificationRejected: number
  rejectionRate: number
  categoryBreakdown: Array<{ category: string; label: string; count: number; color: string }>
  weeklyTrend: WeeklyCount[]
}

export interface ProjectProgressRow {
  id: string
  name: string
  companyName: string
  total: number
  deliveredCount: number
  completionPercent: number
  byStatus: Record<string, number>
}

export interface OverviewStats {
  totalWeightKg: number
  totalElements: number
  avgWeightKg: number
  statusBreakdown: Array<{ status: string; label: string; count: number; color: string }>
}

export interface ReportData {
  throughput: WeeklyCount[]
  elementTypes: ElementTypeCount[]
  cycleTime: CycleTimeStage[]
  bottleneck: CycleTimeStage | null
  deliveryStats: DeliveryStats
  qualityStats: QualityStats
  projectProgress: ProjectProgressRow[]
  overview: OverviewStats
}

// ============================================================
// Helpers
// ============================================================

const typeLabels: Record<string, { label: string; color: string }> = {
  wall: { label: 'Veggur', color: '#3b82f6' },
  filigran: { label: 'Filigran', color: '#8b5cf6' },
  staircase: { label: 'Stigi', color: '#f59e0b' },
  balcony: { label: 'Svalir', color: '#10b981' },
  ceiling: { label: 'Þak', color: '#ef4444' },
  column: { label: 'Súla', color: '#6366f1' },
  beam: { label: 'Bita', color: '#ec4899' },
  other: { label: 'Annað', color: '#a1a1aa' },
}

const statusLabels: Record<string, { label: string; color: string }> = {
  planned: { label: 'Skipulögð', color: '#a1a1aa' },
  rebar: { label: 'Járnabundið', color: '#eab308' },
  cast: { label: 'Steypt', color: '#f97316' },
  curing: { label: 'Þornar', color: '#f59e0b' },
  ready: { label: 'Tilbúið', color: '#22c55e' },
  loaded: { label: 'Á bíl', color: '#3b82f6' },
  delivered: { label: 'Afhent', color: '#10b981' },
}

const fixCategoryLabels: Record<string, { label: string; color: string }> = {
  material: { label: 'Efni', color: '#ef4444' },
  assembly: { label: 'Samsetning', color: '#f97316' },
  design: { label: 'Hönnun', color: '#8b5cf6' },
  transport: { label: 'Flutningur', color: '#3b82f6' },
  other: { label: 'Annað', color: '#a1a1aa' },
}

/** Get ISO week start (Monday) for a date */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Format a date as a short Icelandic week label */
function formatWeekLabel(date: Date): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des']
  return `${date.getDate()}. ${months[date.getMonth()]}`
}

/** Group timestamps into weekly buckets, filling gaps with zeros */
function bucketByWeek(dates: Date[], range: DateRange): WeeklyCount[] {
  const counts = new Map<string, number>()

  for (const d of dates) {
    const ws = getWeekStart(d)
    const key = ws.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  // Fill in all weeks in range
  const result: WeeklyCount[] = []
  const rangeStart = getWeekStart(new Date(range.from))
  const rangeEnd = new Date(range.to)

  const current = new Date(rangeStart)
  while (current <= rangeEnd) {
    const key = current.toISOString().slice(0, 10)
    result.push({
      week: formatWeekLabel(current),
      weekStart: key,
      count: counts.get(key) || 0,
    })
    current.setDate(current.getDate() + 7)
  }

  return result
}

function hoursBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (diff < 0) return null
  return diff / (1000 * 60 * 60)
}

// ============================================================
// Query Functions
// ============================================================

export async function getProductionMetrics(dateRange: DateRange) {
  const supabase = await createClient()

  const { data: elements } = await supabase
    .from('elements')
    .select('id, ready_at, element_type, created_at')
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to)

  const allElements = elements || []

  // Throughput: elements that became ready, grouped by week
  const readyDates = allElements
    .filter(e => e.ready_at)
    .map(e => new Date(e.ready_at!))
  const throughput = bucketByWeek(readyDates, dateRange)

  // Element types
  const typeCounts = new Map<string, number>()
  for (const e of allElements) {
    const t = e.element_type || 'other'
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1)
  }

  const elementTypes: ElementTypeCount[] = Array.from(typeCounts.entries())
    .map(([type, count]) => ({
      type,
      label: typeLabels[type]?.label || type,
      count,
      color: typeLabels[type]?.color || '#a1a1aa',
    }))
    .sort((a, b) => b.count - a.count)

  return { throughput, elementTypes }
}

export async function getCycleTimeMetrics(dateRange: DateRange) {
  const supabase = await createClient()

  const { data: elements } = await supabase
    .from('elements')
    .select('created_at, rebar_completed_at, cast_at, curing_completed_at, ready_at')
    .not('ready_at', 'is', null)
    .gte('ready_at', dateRange.from)
    .lte('ready_at', dateRange.to)

  const allElements = elements || []

  const stages: Record<string, { label: string; durations: number[] }> = {
    planned_to_rebar: { label: 'Skipul. → Járn', durations: [] },
    rebar_to_cast: { label: 'Járn → Steypa', durations: [] },
    cast_to_curing: { label: 'Steypa → Þurr.', durations: [] },
    curing_to_ready: { label: 'Þurr. → Tilbúið', durations: [] },
  }

  for (const e of allElements) {
    const h1 = hoursBetween(e.created_at, e.rebar_completed_at)
    const h2 = hoursBetween(e.rebar_completed_at, e.cast_at)
    const h3 = hoursBetween(e.cast_at, e.curing_completed_at)
    const h4 = hoursBetween(e.curing_completed_at, e.ready_at)

    if (h1 !== null) stages.planned_to_rebar.durations.push(h1)
    if (h2 !== null) stages.rebar_to_cast.durations.push(h2)
    if (h3 !== null) stages.cast_to_curing.durations.push(h3)
    if (h4 !== null) stages.curing_to_ready.durations.push(h4)
  }

  const cycleTime: CycleTimeStage[] = Object.entries(stages).map(([key, s]) => ({
    stage: s.label,
    stageKey: key,
    avgHours: s.durations.length > 0
      ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length * 10) / 10
      : 0,
    sampleSize: s.durations.length,
  }))

  // Identify bottleneck (longest avg stage with at least 1 sample)
  const withData = cycleTime.filter(s => s.sampleSize > 0)
  const bottleneck = withData.length > 0
    ? withData.reduce((a, b) => a.avgHours > b.avgHours ? a : b)
    : null

  return { cycleTime, bottleneck }
}

export async function getDeliveryMetrics(dateRange: DateRange) {
  const supabase = await createClient()

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, status, planned_date, departed_at, completed_at, created_at')
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to)

  const all = deliveries || []
  const completed = all.filter(d => d.completed_at)

  // On-time: completed_at on or before end of planned_date day
  let onTimeCount = 0
  for (const d of completed) {
    if (d.planned_date && d.completed_at) {
      const planned = new Date(d.planned_date)
      planned.setHours(23, 59, 59, 999) // end of planned day
      if (new Date(d.completed_at) <= planned) {
        onTimeCount++
      }
    }
  }

  // Average duration (departed → completed)
  const durations: number[] = []
  for (const d of completed) {
    const h = hoursBetween(d.departed_at, d.completed_at)
    if (h !== null && h > 0) durations.push(h)
  }
  const avgDurationHours = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10
    : 0

  // Weekly trend (by created_at)
  const createdDates = all.map(d => new Date(d.created_at || d.planned_date || ''))
    .filter(d => !isNaN(d.getTime()))
  const weeklyTrend = bucketByWeek(createdDates, dateRange)

  return {
    totalDeliveries: all.length,
    completedDeliveries: completed.length,
    onTimeCount,
    onTimePercent: completed.length > 0 ? Math.round(onTimeCount / completed.length * 100) : 0,
    avgDurationHours,
    weeklyTrend,
  } satisfies DeliveryStats
}

export async function getQualityMetrics(dateRange: DateRange) {
  const supabase = await createClient()

  const [fixResult, verifyResult, elementsResult] = await Promise.all([
    supabase
      .from('fix_in_factory')
      .select('id, category, delivery_impact, created_at')
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to),
    (supabase as any)
      .from('visual_verifications')
      .select('id, status, verified_at')
      .gte('verified_at', dateRange.from)
      .lte('verified_at', dateRange.to),
    supabase
      .from('elements')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to),
  ])

  const fixes = fixResult.data || []
  const verifications = verifyResult.data || []
  const totalElements = elementsResult.count || 0

  // Category breakdown
  const catCounts = new Map<string, number>()
  let deliveryImpactCount = 0
  for (const f of fixes) {
    const cat = f.category || 'other'
    catCounts.set(cat, (catCounts.get(cat) || 0) + 1)
    if (f.delivery_impact) deliveryImpactCount++
  }

  const categoryBreakdown = Array.from(catCounts.entries()).map(([cat, count]) => ({
    category: cat,
    label: fixCategoryLabels[cat]?.label || cat,
    count,
    color: fixCategoryLabels[cat]?.color || '#a1a1aa',
  }))

  // Verification rejection
  const rejected = verifications.filter((v: any) => v.status === 'rejected').length

  // Weekly defect trend
  const fixDates = fixes
    .filter(f => f.created_at)
    .map(f => new Date(f.created_at!))
  const weeklyTrend = bucketByWeek(fixDates, dateRange)

  return {
    totalDefects: fixes.length,
    defectRate: totalElements > 0 ? Math.round(fixes.length / totalElements * 100 * 10) / 10 : 0,
    deliveryImpactCount,
    deliveryImpactPercent: fixes.length > 0 ? Math.round(deliveryImpactCount / fixes.length * 100) : 0,
    verificationTotal: verifications.length,
    verificationRejected: rejected,
    rejectionRate: verifications.length > 0 ? Math.round(rejected / verifications.length * 100 * 10) / 10 : 0,
    categoryBreakdown,
    weeklyTrend,
  } satisfies QualityStats
}

export async function getProjectProgress() {
  const supabase = await createClient()

  const [projectsResult, elementsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, companies (name)')
      .order('name'),
    supabase
      .from('elements')
      .select('id, project_id, status'),
  ])

  const projects = projectsResult.data || []
  const elements = elementsResult.data || []

  // Group elements by project
  const byProject = new Map<string, Array<{ status: string | null }>>()
  for (const e of elements) {
    if (!e.project_id) continue
    if (!byProject.has(e.project_id)) byProject.set(e.project_id, [])
    byProject.get(e.project_id)!.push(e)
  }

  const rows: ProjectProgressRow[] = projects.map(p => {
    const els = byProject.get(p.id) || []
    const total = els.length
    const statusCounts: Record<string, number> = {}
    let delivered = 0

    for (const e of els) {
      const s = e.status || 'planned'
      statusCounts[s] = (statusCounts[s] || 0) + 1
      if (s === 'delivered') delivered++
    }

    return {
      id: p.id,
      name: p.name,
      companyName: (p.companies as { name: string } | null)?.name || '—',
      total,
      deliveredCount: delivered,
      completionPercent: total > 0 ? Math.round(delivered / total * 100) : 0,
      byStatus: statusCounts,
    }
  })
    .filter(r => r.total > 0) // Only projects with elements
    .sort((a, b) => b.completionPercent - a.completionPercent)

  return rows
}

export async function getOverviewStats(dateRange: DateRange) {
  const supabase = await createClient()

  const { data: elements } = await supabase
    .from('elements')
    .select('id, status, weight_kg')
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to)

  const all = elements || []

  // Status breakdown
  const statusCounts = new Map<string, number>()
  let totalWeight = 0
  let weightCount = 0

  for (const e of all) {
    const s = e.status || 'planned'
    statusCounts.set(s, (statusCounts.get(s) || 0) + 1)
    if (e.weight_kg && e.weight_kg > 0) {
      totalWeight += e.weight_kg
      weightCount++
    }
  }

  const statusBreakdown = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    label: statusLabels[status]?.label || status,
    count,
    color: statusLabels[status]?.color || '#a1a1aa',
  }))

  return {
    totalWeightKg: Math.round(totalWeight),
    totalElements: all.length,
    avgWeightKg: weightCount > 0 ? Math.round(totalWeight / weightCount) : 0,
    statusBreakdown,
  } satisfies OverviewStats
}

// ============================================================
// Master fetch function
// ============================================================

export async function getReportData(dateRange: DateRange): Promise<ReportData> {
  const [
    production,
    cycle,
    delivery,
    quality,
    progress,
    overview,
  ] = await Promise.all([
    getProductionMetrics(dateRange),
    getCycleTimeMetrics(dateRange),
    getDeliveryMetrics(dateRange),
    getQualityMetrics(dateRange),
    getProjectProgress(),
    getOverviewStats(dateRange),
  ])

  return {
    throughput: production.throughput,
    elementTypes: production.elementTypes,
    cycleTime: cycle.cycleTime,
    bottleneck: cycle.bottleneck,
    deliveryStats: delivery,
    qualityStats: quality,
    projectProgress: progress,
    overview,
  }
}
