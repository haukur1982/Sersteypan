import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

/**
 * GET /api/ai/daily-summary
 *
 * Returns an AI-generated daily production summary for the factory.
 * Cached per day — generates on first request, returns cached for the rest of the day.
 *
 * Auth: admin + factory_manager only.
 * If ANTHROPIC_API_KEY is not set, returns 404 (feature disabled).
 */
export async function GET() {
  // 1. Check if feature is enabled
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI summary feature is not enabled' },
      { status: 404 }
    )
  }

  // 2. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 4. Check cache for today's summary
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const { data: cached } = await supabase
    .from('ai_daily_summaries')
    .select('summary_text, anomalies, generated_at')
    .eq('summary_date', today)
    .maybeSingle()

  if (cached) {
    return NextResponse.json({
      summary: cached.summary_text,
      anomalies: cached.anomalies,
      generatedAt: cached.generated_at,
      cached: true,
    })
  }

  // 5. Gather today's data
  try {
    const data = await gatherDailyData(supabase, today)

    // 6. Generate summary with Claude
    const anthropic = new Anthropic({ apiKey })

    const systemPrompt = `Þú ert framleiðsluaðstoðarmaður í íslensku steyptueiningaverksmiðju (precast concrete factory).
Þú færð gögn um daginn og átt að skrifa stutta, áttavitandi samantekt á íslensku (3-5 setningar).
Nefndu helstu atburði og viðvaranir. Vertu nákvæmur en stutt og hnitmiðaður.
Skrifaðu EKKI á ensku. Notaðu eingöngu íslensku.
Ekki nota upphafsformúlur eins og "Hér er samantekt dagsins" — byrjaðu beint á efninu.`

    const userPrompt = `Hér eru gögn dagsins (${today}):

**Stöðubreytingar í dag:**
${data.statusChanges.length > 0
      ? data.statusChanges.map(sc => `- ${sc.elementName}: ${sc.previousStatus} → ${sc.newStatus}`).join('\n')
      : 'Engar stöðubreytingar í dag.'}

**Nýir gallar skráðir í dag:**
${data.newDefects.length > 0
      ? data.newDefects.map(d => `- ${d.elementName}: ${d.description} (${d.priority}, ${d.deliveryImpact ? 'hefur áhrif á afhendingu' : 'án áhrifa á afhendingu'})`).join('\n')
      : 'Engir nýir gallar.'}

**Afhendingar loknar í dag:**
${data.completedDeliveries.length > 0
      ? data.completedDeliveries.map(d => `- ${d.projectName}: ${d.itemCount} einingar`).join('\n')
      : 'Engar afhendingar loknar í dag.'}

**Fastar einingar (yfir viðmiðunarmörkum):**
${data.stuckElements.length > 0
      ? data.stuckElements.map(s => `- ${s.elementName}: ${s.daysStuck} dagar í stöðu "${s.status}" (mörk: ${s.threshold} dagar)`).join('\n')
      : 'Engar fastar einingar.'}

**Yfirlitsnúmer:**
- Heildareiningar: ${data.totalElements}
- Í framleiðslu: ${data.inProduction}
- Tilbúnar: ${data.ready}
- Afhent í dag: ${data.deliveredToday}
- Opnir gallar: ${data.openDefects}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    // Extract text from response
    const summaryText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n')
      .trim()

    // 7. Detect anomalies based on thresholds
    const anomalies = detectAnomalies(data)

    // 8. Cache the result
    await supabase
      .from('ai_daily_summaries')
      .insert({
        summary_date: today,
        summary_text: summaryText,
        anomalies: anomalies,
        generated_at: new Date().toISOString(),
      })

    return NextResponse.json({
      summary: summaryText,
      anomalies,
      generatedAt: new Date().toISOString(),
      cached: false,
    })
  } catch (err) {
    console.error('Error generating AI daily summary:', err)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

// -- Data Gathering --

type DailyData = {
  statusChanges: Array<{ elementName: string; previousStatus: string; newStatus: string }>
  newDefects: Array<{ elementName: string; description: string; priority: string; deliveryImpact: boolean }>
  completedDeliveries: Array<{ projectName: string; itemCount: number }>
  stuckElements: Array<{ elementName: string; status: string; daysStuck: number; threshold: number }>
  totalElements: number
  inProduction: number
  ready: number
  deliveredToday: number
  openDefects: number
}

async function gatherDailyData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  today: string
): Promise<DailyData> {
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`

  // Run all queries in parallel
  const [
    statusChangesResult,
    newDefectsResult,
    completedDeliveriesResult,
    elementsResult,
    openDefectsResult,
  ] = await Promise.all([
    // Status changes today
    supabase
      .from('element_events')
      .select('status, previous_status, element_id, elements(name)')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: false })
      .limit(50),
    // New defects today
    supabase
      .from('fix_in_factory')
      .select('issue_description, priority, delivery_impact, element_id, elements(name)')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .limit(20),
    // Completed deliveries today
    supabase
      .from('deliveries')
      .select('id, project:projects(name), delivery_items(id)')
      .eq('status', 'completed')
      .gte('completed_at', todayStart)
      .lte('completed_at', todayEnd)
      .limit(20),
    // All elements for summary stats
    supabase
      .from('elements')
      .select('status'),
    // Open defects count
    supabase
      .from('fix_in_factory')
      .select('id', { count: 'exact', head: true })
      .is('completed_at', null),
  ])

  const statusChanges = (statusChangesResult.data || []).map(event => ({
    elementName: (event.elements as { name: string } | null)?.name || 'Óþekkt',
    previousStatus: event.previous_status || 'none',
    newStatus: event.status || 'unknown',
  }))

  const newDefects = (newDefectsResult.data || []).map(defect => ({
    elementName: (defect.elements as { name: string } | null)?.name || 'Óþekkt',
    description: defect.issue_description || '',
    priority: defect.priority || 'low',
    deliveryImpact: defect.delivery_impact || false,
  }))

  const completedDeliveries = (completedDeliveriesResult.data || []).map(d => ({
    projectName: (d.project as { name: string } | null)?.name || 'Óþekkt verkefni',
    itemCount: Array.isArray(d.delivery_items) ? d.delivery_items.length : 0,
  }))

  const allElements = elementsResult.data || []
  const statusCounts: Record<string, number> = {}
  for (const el of allElements) {
    const s = el.status || 'planned'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  // Stuck elements: omitted from API query for speed.
  // The factory dashboard handles stuck element detection visually.
  const stuckElements: DailyData['stuckElements'] = []

  return {
    statusChanges,
    newDefects,
    completedDeliveries,
    stuckElements,
    totalElements: allElements.length,
    inProduction: (statusCounts['rebar'] || 0) + (statusCounts['cast'] || 0) + (statusCounts['curing'] || 0),
    ready: statusCounts['ready'] || 0,
    deliveredToday: statusChanges.filter(sc => sc.newStatus === 'delivered').length,
    openDefects: openDefectsResult.count || 0,
  }
}

// -- Anomaly Detection --

type Anomaly = {
  type: 'stuck' | 'high_defects' | 'no_activity' | 'delivery_blocked'
  severity: 'info' | 'warning' | 'critical'
  message: string
}

function detectAnomalies(data: DailyData): Anomaly[] {
  const anomalies: Anomaly[] = []

  // No status changes today
  if (data.statusChanges.length === 0 && data.totalElements > 0) {
    anomalies.push({
      type: 'no_activity',
      severity: 'info',
      message: 'Engar stöðubreytingar í dag',
    })
  }

  // High defect rate
  if (data.newDefects.length >= 3) {
    anomalies.push({
      type: 'high_defects',
      severity: 'warning',
      message: `${data.newDefects.length} nýir gallar skráðir í dag`,
    })
  }

  // Delivery-blocking defects
  const deliveryBlockingDefects = data.newDefects.filter(d => d.deliveryImpact)
  if (deliveryBlockingDefects.length > 0) {
    anomalies.push({
      type: 'delivery_blocked',
      severity: 'critical',
      message: `${deliveryBlockingDefects.length} nýir gallar hafa áhrif á afhendingu`,
    })
  }

  // Many open defects
  if (data.openDefects >= 10) {
    anomalies.push({
      type: 'high_defects',
      severity: 'warning',
      message: `${data.openDefects} opnir gallar samtals`,
    })
  }

  return anomalies
}
