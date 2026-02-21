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
  const vatRate = parseFloat(formData.get('vatRate') as string) || 11
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
  const vatRate = parseFloat(formData.get('vatRate') as string) || 11
  const notes = (formData.get('notes') as string) || null

  if (!contractId || isNaN(grunnvisitala) || grunnvisitala <= 0) {
    return { error: 'Vantar gildi' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('framvinda_contracts')
    .update({ grunnvisitala, vat_rate: vatRate, notes })
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

  // Delete existing lines for this contract
  const { error: deleteError } = await supabase
    .from('framvinda_contract_lines')
    .delete()
    .eq('contract_id', contractId)

  if (deleteError) return { error: 'Villa við eyðingu: ' + deleteError.message }

  // Insert new lines
  const inserts: FramvindaContractLineInsert[] = lines.map((line) => ({
    contract_id: contractId,
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

  const { error: insertError } = await supabase
    .from('framvinda_contract_lines')
    .insert(inserts)

  if (insertError) return { error: 'Villa við vistun: ' + insertError.message }

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
  visitala: number
): Promise<{ error: string; periodId?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  if (!periodStart || !periodEnd || isNaN(visitala) || visitala <= 0) {
    return { error: 'Vantar gildi' }
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
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: 'Villa: ' + error.message }

  // Create period lines for all contract lines (initialized to 0)
  const { data: contractLines } = await supabase
    .from('framvinda_contract_lines')
    .select('id')
    .eq('contract_id', contractId)

  if (contractLines && contractLines.length > 0) {
    const periodLineInserts = contractLines.map((cl) => ({
      period_id: period.id,
      contract_line_id: cl.id,
      quantity_this_period: 0,
      amount_this_period: 0,
      is_manually_adjusted: false,
    }))

    await supabase.from('framvinda_period_lines').insert(periodLineInserts)
  }

  revalidatePath('/admin/framvinda')
  return { error: '', periodId: period.id }
}

export async function savePeriodLines(
  periodId: string,
  visitala: number,
  lines: Array<{
    id: string
    quantity_this_period: number
    amount_this_period: number
    is_manually_adjusted: boolean
    notes: string | null
  }>
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

  // Update period totals
  const subtotal = lines.reduce((sum, l) => sum + l.amount_this_period, 0)

  // Get grunnvisitala from contract
  const { data: periodData } = await supabase
    .from('framvinda_periods')
    .select('contract_id, visitala')
    .eq('id', periodId)
    .single()

  let visitalaAmount = 0
  let totalWithVisitala = subtotal
  if (periodData) {
    const { data: contract } = await supabase
      .from('framvinda_contracts')
      .select('grunnvisitala')
      .eq('id', periodData.contract_id)
      .single()

    if (contract) {
      const multiplier = visitala / contract.grunnvisitala
      visitalaAmount = Math.round((multiplier - 1) * subtotal)
      totalWithVisitala = subtotal + visitalaAmount
    }
  }

  await supabase
    .from('framvinda_periods')
    .update({
      visitala,
      subtotal: Math.round(subtotal),
      visitala_amount: visitalaAmount,
      total_with_visitala: totalWithVisitala,
    })
    .eq('id', periodId)

  revalidatePath('/admin/framvinda')
  return { error: '' }
}

export async function finalizePeriod(
  periodId: string
): Promise<{ error: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Ekki innskráður' }

  const supabase = await createClient()

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
