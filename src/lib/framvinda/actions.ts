'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/getServerUser'
import type {
  FramvindaContractLineInsert,
  FramvindaCategory,
  PricingUnit,
} from './types'
import { suggestQuantityForLine } from './calculations'

// ============================================================
// Contract actions
// ============================================================

export async function createContract(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const projectId = formData.get('projectId') as string
  const grunnvisitala = parseFloat(formData.get('grunnvisitala') as string)
  const vatRate = parseFloat(formData.get('vatRate') as string) || 24
  const retainagePercentage = parseFloat(formData.get('retainagePercentage') as string) || 0
  const notes = (formData.get('notes') as string) || null

  if (!projectId || isNaN(grunnvisitala) || grunnvisitala <= 0) {
    return { error: 'Vantar gildi fyrir grunnvísitölu' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('framvinda_contracts')
    .insert({
      project_id: projectId,
      grunnvisitala,
      vat_rate: vatRate,
      retainage_percentage: retainagePercentage,
      notes,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Samningur er þegar til fyrir þetta verk' }
    }
    return { error: 'Villa við að búa til samning: ' + error.message }
  }

  redirect(`/admin/framvinda/${projectId}`)
}

export async function updateContract(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const contractId = formData.get('contractId') as string
  const grunnvisitala = parseFloat(formData.get('grunnvisitala') as string)
  const vatRate = parseFloat(formData.get('vatRate') as string) || 24
  const retainagePercentage = parseFloat(formData.get('retainagePercentage') as string) || 0
  const notes = (formData.get('notes') as string) || null

  if (!contractId || isNaN(grunnvisitala) || grunnvisitala <= 0) {
    return { error: 'Vantar gildi' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('framvinda_contracts')
    .update({ grunnvisitala, vat_rate: vatRate, retainage_percentage: retainagePercentage, notes })
    .eq('id', contractId)

  if (error) return { error: 'Villa: ' + error.message }

  revalidatePath('/admin/framvinda')
  return { error: '' }
}

/** Create contract + lines in one shot (for new contracts) */
export async function createContractWithLines(
  projectId: string,
  grunnvisitala: number,
  vatRate: number,
  retainagePercentage: number,
  lines: Array<{
    category: FramvindaCategory
    sort_order: number
    label: string
    is_extra: boolean
    extra_description?: string | null
    pricing_unit: PricingUnit
    contract_count: number | null
    unit_area_m2: number | null
    total_quantity: number
    unit_price: number
    total_price: number
    building_id?: string | null
    floor?: number | null
    element_type_key?: string | null
    drawing_reference_pattern?: string | null
  }>
): Promise<{ error: string; contractId?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  if (!projectId || isNaN(grunnvisitala) || grunnvisitala <= 0) {
    return { error: 'Vantar gildi fyrir grunnvísitölu' }
  }

  const supabase = await createClient()

  // Create contract
  const { data: contract, error: contractError } = await supabase
    .from('framvinda_contracts')
    .insert({
      project_id: projectId,
      grunnvisitala,
      vat_rate: vatRate,
      retainage_percentage: retainagePercentage || 0,
      notes: null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (contractError) {
    if (contractError.code === '23505') {
      return { error: 'Samningur er þegar til fyrir þetta verk' }
    }
    return { error: 'Villa: ' + contractError.message }
  }

  // Insert lines
  if (lines.length > 0) {
    const inserts: FramvindaContractLineInsert[] = lines.map((line) => ({
      contract_id: contract.id,
      category: line.category,
      sort_order: line.sort_order,
      label: line.label,
      is_extra: line.is_extra,
      extra_description: line.extra_description ?? null,
      pricing_unit: line.pricing_unit,
      contract_count: line.contract_count,
      unit_area_m2: line.unit_area_m2,
      total_quantity: line.total_quantity,
      unit_price: line.unit_price,
      total_price: line.total_price,
      building_id: line.building_id ?? null,
      floor: line.floor ?? null,
      element_type_key: line.element_type_key ?? null,
      drawing_reference_pattern: line.drawing_reference_pattern ?? null,
    }))

    const { error: linesError } = await supabase
      .from('framvinda_contract_lines')
      .insert(inserts)

    if (linesError) return { error: 'Villa við línur: ' + linesError.message }
  }

  revalidatePath('/admin/framvinda')
  return { error: '', contractId: contract.id }
}

// ============================================================
// Contract lines actions
// ============================================================

export async function saveContractLines(
  contractId: string,
  revisionId: string | null = null,
  lines: Array<{
    id?: string
    category: FramvindaCategory
    sort_order: number
    label: string
    is_extra: boolean
    extra_description?: string | null
    pricing_unit: PricingUnit
    contract_count: number | null
    unit_area_m2: number | null
    total_quantity: number
    unit_price: number
    total_price: number
    building_id?: string | null
    floor?: number | null
    element_type_key?: string | null
    drawing_reference_pattern?: string | null
  }>
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const supabase = await createClient()

  if (revisionId) {
    // Check if revision is approved
    const { data: revision } = await supabase
      .from('framvinda_contract_revisions')
      .select('status')
      .eq('id', revisionId)
      .single()

    if (revision?.status === 'approved') {
      return { error: 'Ekki hægt að breyta samþykktri viðbót' }
    }
  } else {
    // Check if contract is frozen (has finalized periods)
    const { data: contract } = await supabase
      .from('framvinda_contracts')
      .select('is_frozen')
      .eq('id', contractId)
      .single()

    if (contract?.is_frozen) {
      return { error: 'Samningur er frystur — stofnaðu Viðbót' }
    }
  }

  // Get existing line IDs for this contract/revision
  let existingLinesQuery = supabase
    .from('framvinda_contract_lines')
    .select('id')
    .eq('contract_id', contractId)

  if (revisionId) {
    existingLinesQuery = existingLinesQuery.eq('revision_id', revisionId)
  } else {
    existingLinesQuery = existingLinesQuery.is('revision_id', null)
  }

  const { data: existingLines } = await existingLinesQuery

  const existingIds = new Set((existingLines ?? []).map((l) => l.id))
  const incomingIds = new Set(lines.filter((l) => l.id).map((l) => l.id!))

  // Delete only lines that were removed
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('framvinda_contract_lines')
      .delete()
      .in('id', toDelete)

    if (deleteError) {
      if (deleteError.code === '23503') {
        return { error: 'Ekki hægt að eyða línum sem hafa verið notaðar í framvindutímabil' }
      }
      return { error: 'Villa við eyðingu: ' + deleteError.message }
    }
  }

  // Upsert
  for (const line of lines) {
    const lineData = {
      contract_id: contractId,
      revision_id: revisionId,
      category: line.category,
      sort_order: line.sort_order,
      label: line.label,
      is_extra: line.is_extra,
      extra_description: line.extra_description ?? null,
      pricing_unit: line.pricing_unit,
      contract_count: line.contract_count,
      unit_area_m2: line.unit_area_m2,
      total_quantity: line.total_quantity,
      unit_price: line.unit_price,
      total_price: line.total_price,
      building_id: line.building_id ?? null,
      floor: line.floor ?? null,
      element_type_key: line.element_type_key ?? null,
      drawing_reference_pattern: line.drawing_reference_pattern ?? null,
    }

    if (line.id && existingIds.has(line.id)) {
      const { error } = await supabase
        .from('framvinda_contract_lines')
        .update(lineData)
        .eq('id', line.id)
      if (error) return { error: 'Villa við uppfærslu línu: ' + error.message }
    } else {
      const { error } = await supabase
        .from('framvinda_contract_lines')
        .insert(lineData as FramvindaContractLineInsert)
      if (error) return { error: 'Villa við vistun línu: ' + error.message }
    }
  }

  revalidatePath('/admin/framvinda')
  return { error: '' }
}

// ============================================================
// Revsions actions
// ============================================================

export async function createRevision(
  contractId: string,
  name: string
): Promise<{ error: string; revisionId?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('framvinda_contract_revisions')
    .insert({
      contract_id: contractId,
      name,
    })
    .select('id')
    .single()

  if (error) return { error: 'Villa: ' + error.message }
  revalidatePath('/admin/framvinda')
  return { error: '', revisionId: data.id }
}

export async function approveRevision(revisionId: string): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('framvinda_contract_revisions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id
    })
    .eq('id', revisionId)

  if (error) return { error: 'Villa: ' + error.message }
  revalidatePath('/admin/framvinda')
  return { error: '' }
}

export async function deleteRevision(revisionId: string): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }
  const supabase = await createClient()

  const { data: revision } = await supabase
    .from('framvinda_contract_revisions')
    .select('status')
    .eq('id', revisionId)
    .single()

  if (revision?.status === 'approved') return { error: 'Ekki hægt að eyða samþykktri viðbót' }

  const { error } = await supabase
    .from('framvinda_contract_revisions')
    .delete()
    .eq('id', revisionId)

  if (error) return { error: 'Villa: ' + error.message }
  revalidatePath('/admin/framvinda')
  return { error: '' }
}


// ============================================================
// Period actions
// ============================================================

export async function createPeriod(
  contractId: string,
  periodStart: string,
  periodEnd: string,
  visitala: number,
  grunnvisitala: number
): Promise<{ error: string; periodId?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  if (!periodStart || !periodEnd || isNaN(visitala) || visitala <= 0) {
    return { error: 'Vantar gildi' }
  }
  if (isNaN(grunnvisitala) || grunnvisitala <= 0) {
    return { error: 'Vantar gildi fyrir grunnvísitölu' }
  }

  const supabase = await createClient()

  // Get next period number
  const { data: existingPeriods } = await supabase
    .from('framvinda_periods')
    .select('period_number')
    .eq('contract_id', contractId)
    .order('period_number', { ascending: false })
    .limit(1)

  const nextNumber = (existingPeriods?.[0]?.period_number ?? 0) + 1

  const { data: period, error } = await supabase
    .from('framvinda_periods')
    .insert({
      contract_id: contractId,
      period_number: nextNumber,
      period_start: periodStart,
      period_end: periodEnd,
      visitala,
      grunnvisitala,
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: 'Villa: ' + error.message }

  // Get contract lines with full data for auto-suggest
  const { data: contractLines } = await supabase
    .from('framvinda_contract_lines')
    .select('*')
    .eq('contract_id', contractId)

  if (contractLines && contractLines.length > 0) {
    // Fetch project elements and deliveries for auto-suggest
    const { data: contract } = await supabase
      .from('framvinda_contracts')
      .select('project_id')
      .eq('id', contractId)
      .single()

    let elements: Array<{
      id: string
      name: string | null
      element_type: string | null
      building_id: string | null
      floor: number | null
      length_mm: number | null
      width_mm: number | null
      drawing_reference: string | null
      status: string | null
      cast_at: string | null
      ready_at: string | null
      delivered_at: string | null
    }> = []
    let deliveries: Array<{
      id: string
      status: string | null
      completed_at: string | null
    }> = []

    if (contract) {
      const [elemResult, delResult] = await Promise.all([
        supabase
          .from('elements')
          .select('id, name, element_type, building_id, floor, length_mm, width_mm, drawing_reference, status, cast_at, ready_at, delivered_at')
          .eq('project_id', contract.project_id),
        supabase
          .from('deliveries')
          .select('id, status, completed_at')
          .eq('project_id', contract.project_id),
      ])
      elements = elemResult.data ?? []
      deliveries = delResult.data ?? []
    }

    // Create period lines with auto-suggested quantities
    let periodSubtotal = 0
    const periodLineInserts = contractLines.map((cl) => {
      const suggestedQty = suggestQuantityForLine(
        cl,
        elements,
        deliveries,
        periodStart,
        periodEnd
      )
      const roundedQty = Math.round(suggestedQty * 10000) / 10000
      const amount = roundedQty * cl.unit_price
      periodSubtotal += amount

      return {
        period_id: period.id,
        contract_line_id: cl.id,
        quantity_this_period: roundedQty,
        amount_this_period: Math.round(amount),
        is_manually_adjusted: false,
      }
    })

    await supabase.from('framvinda_period_lines').insert(periodLineInserts)

    // Update period totals with auto-suggested values
    const visitalaMultiplier = visitala / grunnvisitala
    const visitalaAmount = Math.round((visitalaMultiplier - 1) * periodSubtotal)
    const totalWithVisitala = Math.round(periodSubtotal) + visitalaAmount

    await supabase
      .from('framvinda_periods')
      .update({
        subtotal: Math.round(periodSubtotal),
        visitala_amount: visitalaAmount,
        total_with_visitala: totalWithVisitala,
      })
      .eq('id', period.id)
  }

  revalidatePath('/admin/framvinda')
  return { error: '', periodId: period.id }
}

export async function savePeriodLines(
  periodId: string,
  visitala: number,
  grunnvisitala: number,
  lines: Array<{
    id: string
    quantity_this_period: number
    amount_this_period: number
    is_manually_adjusted: boolean
    notes: string | null
  }>,
  description?: string | null,
  periodNotes?: string | null
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const supabase = await createClient()

  // Check period is still draft
  const { data: period } = await supabase
    .from('framvinda_periods')
    .select('status')
    .eq('id', periodId)
    .single()

  if (!period || period.status !== 'draft') {
    return { error: 'Framvinda er þegar lokuð' }
  }

  // Update each period line
  for (const line of lines) {
    const { error } = await supabase
      .from('framvinda_period_lines')
      .update({
        quantity_this_period: line.quantity_this_period,
        amount_this_period: line.amount_this_period,
        is_manually_adjusted: line.is_manually_adjusted,
        notes: line.notes,
      })
      .eq('id', line.id)

    if (error) return { error: 'Villa við vistun línu: ' + error.message }
  }

  // Calculate period totals using period's own grunnvisitala
  const subtotal = lines.reduce((sum, l) => sum + l.amount_this_period, 0)
  const multiplier = visitala / grunnvisitala
  const visitalaAmount = Math.round((multiplier - 1) * subtotal)
  const totalWithVisitala = Math.round(subtotal) + visitalaAmount

  await supabase
    .from('framvinda_periods')
    .update({
      visitala,
      grunnvisitala,
      subtotal: Math.round(subtotal),
      visitala_amount: visitalaAmount,
      total_with_visitala: totalWithVisitala,
      description: description ?? null,
      notes: periodNotes ?? null,
    })
    .eq('id', periodId)

  revalidatePath('/admin/framvinda')
  return { error: '' }
}

export async function finalizePeriod(
  periodId: string,
  forceOverBilling?: boolean
): Promise<{ error: string; overBillingWarnings?: string[] }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const supabase = await createClient()

  // Get period info
  const { data: period } = await supabase
    .from('framvinda_periods')
    .select('id, contract_id, period_number, status')
    .eq('id', periodId)
    .single()

  if (!period || period.status !== 'draft') {
    return { error: 'Framvinda er þegar lokuð eða finnst ekki' }
  }

  // Over-billing check (unless admin explicitly confirmed)
  if (!forceOverBilling) {
    const warnings = await checkOverBilling(supabase, period.contract_id, periodId, period.period_number)
    if (warnings.length > 0) {
      return { error: '', overBillingWarnings: warnings }
    }
  }

  // Finalize — the DB trigger will snapshot line data and freeze the contract
  const { error } = await supabase
    .from('framvinda_periods')
    .update({
      status: 'finalized',
      finalized_at: new Date().toISOString(),
      finalized_by: user.id,
    })
    .eq('id', periodId)
    .eq('status', 'draft')

  if (error) return { error: 'Villa: ' + error.message }

  revalidatePath('/admin/framvinda')
  return { error: '' }
}

/** Check if any line exceeds 110% of contract quantity after this period */
async function checkOverBilling(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  periodId: string,
  periodNumber: number
): Promise<string[]> {
  // Get contract lines
  const { data: contractLines } = await supabase
    .from('framvinda_contract_lines')
    .select('id, label, total_quantity')
    .eq('contract_id', contractId)

  if (!contractLines || contractLines.length === 0) return []

  // Get cumulative from prior finalized periods
  const { data: priorPeriods } = await supabase
    .from('framvinda_periods')
    .select('id')
    .eq('contract_id', contractId)
    .eq('status', 'finalized')
    .lt('period_number', periodNumber)

  const priorIds = (priorPeriods ?? []).map((p) => p.id)

  // Get current period lines
  const { data: currentLines } = await supabase
    .from('framvinda_period_lines')
    .select('contract_line_id, quantity_this_period')
    .eq('period_id', periodId)

  // Get prior cumulative quantities
  const priorCumulative = new Map<string, number>()
  if (priorIds.length > 0) {
    const { data: priorLines } = await supabase
      .from('framvinda_period_lines')
      .select('contract_line_id, quantity_this_period')
      .in('period_id', priorIds)

    for (const line of priorLines ?? []) {
      const current = priorCumulative.get(line.contract_line_id) ?? 0
      priorCumulative.set(line.contract_line_id, current + line.quantity_this_period)
    }
  }

  const currentMap = new Map(
    (currentLines ?? []).map((l) => [l.contract_line_id, l.quantity_this_period])
  )

  const warnings: string[] = []
  const THRESHOLD = 1.10 // 110%

  for (const cl of contractLines) {
    if (cl.total_quantity <= 0) continue
    const cumBefore = priorCumulative.get(cl.id) ?? 0
    const thisPeriod = currentMap.get(cl.id) ?? 0
    const cumTotal = cumBefore + thisPeriod
    const ratio = cumTotal / cl.total_quantity

    if (ratio > THRESHOLD) {
      const pct = Math.round(ratio * 100)
      warnings.push(`${cl.label}: ${pct}% af samningsmagni (${cumTotal} / ${cl.total_quantity})`)
    }
  }

  return warnings
}

export async function reopenPeriod(
  periodId: string
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('framvinda_periods')
    .update({
      status: 'draft',
      finalized_at: null,
      finalized_by: null,
    })
    .eq('id', periodId)
    .eq('status', 'finalized')

  if (error) return { error: 'Villa: ' + error.message }

  revalidatePath('/admin/framvinda')
  return { error: '' }
}

export async function deletePeriod(
  periodId: string
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const supabase = await createClient()

  // Only delete draft periods
  const { error } = await supabase
    .from('framvinda_periods')
    .delete()
    .eq('id', periodId)
    .eq('status', 'draft')

  if (error) return { error: 'Villa: ' + error.message }

  revalidatePath('/admin/framvinda')
  return { error: '' }
}
