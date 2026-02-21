'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  FramvindaContract,
  FramvindaContractLine,
  FramvindaPeriod,
  FramvindaPeriodLine,
  ProjectWithFramvindaStatus,
} from './types'

// ============================================================
// Project list with contract status
// ============================================================

export async function getProjectsWithFramvindaStatus(): Promise<ProjectWithFramvindaStatus[]> {
  const supabase = await createClient()

  // Get all active projects with company names
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, address, companies(name)')
    .order('name')

  if (projectsError || !projects) return []

  // Get all contracts
  const { data: contracts } = await supabase
    .from('framvinda_contracts')
    .select('id, project_id')

  // Get period counts per contract
  const { data: periods } = await supabase
    .from('framvinda_periods')
    .select('contract_id, period_number, status')
    .order('period_number', { ascending: false })

  const contractMap = new Map(
    (contracts ?? []).map((c) => [c.project_id, c.id])
  )

  // Group periods by contract
  const periodsByContract = new Map<string, typeof periods>()
  for (const p of periods ?? []) {
    if (!periodsByContract.has(p.contract_id)) {
      periodsByContract.set(p.contract_id, [])
    }
    periodsByContract.get(p.contract_id)!.push(p)
  }

  return projects.map((p) => {
    const contractId = contractMap.get(p.id) ?? null
    const contractPeriods = contractId
      ? periodsByContract.get(contractId) ?? []
      : []
    const latest = contractPeriods[0] ?? null

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      company_name: (p.companies as { name: string } | null)?.name ?? null,
      contract_id: contractId,
      period_count: contractPeriods.length,
      latest_period_number: latest?.period_number ?? null,
      latest_period_status: latest?.status ?? null,
    }
  })
}

// ============================================================
// Contract queries
// ============================================================

export async function getContract(
  projectId: string
): Promise<FramvindaContract | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('framvinda_contracts')
    .select('*')
    .eq('project_id', projectId)
    .single()
  return data
}

export async function getContractWithLines(contractId: string): Promise<{
  contract: FramvindaContract
  lines: FramvindaContractLine[]
} | null> {
  const supabase = await createClient()

  const { data: contract } = await supabase
    .from('framvinda_contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (!contract) return null

  const { data: lines } = await supabase
    .from('framvinda_contract_lines')
    .select('*')
    .eq('contract_id', contractId)
    .order('category')
    .order('sort_order')

  return { contract, lines: lines ?? [] }
}

export async function getContractLines(
  contractId: string
): Promise<FramvindaContractLine[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('framvinda_contract_lines')
    .select('*')
    .eq('contract_id', contractId)
    .order('category')
    .order('sort_order')
  return data ?? []
}

// ============================================================
// Period queries
// ============================================================

export async function getPeriods(
  contractId: string
): Promise<FramvindaPeriod[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('framvinda_periods')
    .select('*')
    .eq('contract_id', contractId)
    .order('period_number')
  return data ?? []
}

export async function getPeriod(
  periodId: string
): Promise<FramvindaPeriod | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('framvinda_periods')
    .select('*')
    .eq('id', periodId)
    .single()
  return data
}

export async function getPeriodLines(
  periodId: string
): Promise<FramvindaPeriodLine[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('framvinda_period_lines')
    .select('*')
    .eq('period_id', periodId)
  return data ?? []
}

/** Get cumulative quantities for all contract lines from finalized periods before a given period */
export async function getCumulativeBeforePeriod(
  contractId: string,
  beforePeriodNumber: number
): Promise<Map<string, number>> {
  const supabase = await createClient()

  // Get all finalized periods with lower period_number
  const { data: priorPeriods } = await supabase
    .from('framvinda_periods')
    .select('id')
    .eq('contract_id', contractId)
    .eq('status', 'finalized')
    .lt('period_number', beforePeriodNumber)

  if (!priorPeriods || priorPeriods.length === 0) {
    return new Map()
  }

  const periodIds = priorPeriods.map((p) => p.id)

  const { data: lines } = await supabase
    .from('framvinda_period_lines')
    .select('contract_line_id, quantity_this_period')
    .in('period_id', periodIds)

  const cumulativeMap = new Map<string, number>()
  for (const line of lines ?? []) {
    const current = cumulativeMap.get(line.contract_line_id) ?? 0
    cumulativeMap.set(
      line.contract_line_id,
      current + line.quantity_this_period
    )
  }

  return cumulativeMap
}

// ============================================================
// Project info for headers
// ============================================================

export async function getProjectForFramvinda(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, address, companies(name, kennitala)')
    .eq('id', projectId)
    .single()
  return data
}

// ============================================================
// Buildings for contract setup (filigran grouping)
// ============================================================

export async function getProjectBuildings(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('buildings')
    .select('id, name, floors')
    .eq('project_id', projectId)
    .order('name')
  return data ?? []
}

// ============================================================
// Elements for auto-suggest
// ============================================================

export async function getProjectElements(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('elements')
    .select(
      'id, name, element_type, building_id, floor, length_mm, width_mm, drawing_reference, status, cast_at, ready_at, delivered_at'
    )
    .eq('project_id', projectId)
    .order('element_type')
    .order('building_id')
    .order('floor')
  return data ?? []
}

export async function getProjectDeliveries(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('deliveries')
    .select('id, status, completed_at')
    .eq('project_id', projectId)
  return data ?? []
}
