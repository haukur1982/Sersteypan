import type { Database } from '@/types/database'

// ============================================================
// Database row types
// ============================================================

export type FramvindaContract = Database['public']['Tables']['framvinda_contracts']['Row']
export type FramvindaContractInsert = Database['public']['Tables']['framvinda_contracts']['Insert']
export type FramvindaContractUpdate = Database['public']['Tables']['framvinda_contracts']['Update']

export type FramvindaContractLine = Database['public']['Tables']['framvinda_contract_lines']['Row']
export type FramvindaContractLineInsert = Database['public']['Tables']['framvinda_contract_lines']['Insert']
export type FramvindaContractLineUpdate = Database['public']['Tables']['framvinda_contract_lines']['Update']

export type FramvindaPeriod = Database['public']['Tables']['framvinda_periods']['Row']
export type FramvindaPeriodInsert = Database['public']['Tables']['framvinda_periods']['Insert']
export type FramvindaPeriodUpdate = Database['public']['Tables']['framvinda_periods']['Update']

export type FramvindaPeriodLine = Database['public']['Tables']['framvinda_period_lines']['Row']
export type FramvindaPeriodLineInsert = Database['public']['Tables']['framvinda_period_lines']['Insert']
export type FramvindaPeriodLineUpdate = Database['public']['Tables']['framvinda_period_lines']['Update']

// ============================================================
// Category types
// ============================================================

export const FRAMVINDA_CATEGORIES = [
  'filigran',
  'svalir',
  'stigar',
  'svalagangar',
  'flutningur',
  'annad',
] as const

export type FramvindaCategory = (typeof FRAMVINDA_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<FramvindaCategory, string> = {
  filigran: 'Filigran',
  svalir: 'Svalir',
  stigar: 'Stigar',
  svalagangar: 'Svalagangar',
  flutningur: 'Flutningur',
  annad: 'Annað',
}

export const PRICING_UNITS = ['m2', 'stk', 'ferdir'] as const
export type PricingUnit = (typeof PRICING_UNITS)[number]

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  m2: 'm²',
  stk: 'stk',
  ferdir: 'ferðir',
}

// ============================================================
// Computed / UI types
// ============================================================

/** A contract line with cumulative data for display in the period editor */
export interface ContractLineWithCumulative {
  line: FramvindaContractLine
  /** Sum of quantity from all finalized periods before this one */
  cumulativeQuantityBefore: number
  /** Quantity entered for the current period */
  quantityThisPeriod: number
  /** Total cumulative = before + this period */
  cumulativeTotal: number
  /** Percentage complete = cumulativeTotal / total_quantity */
  percentComplete: number
  /** Cumulative amount billed = cumulativeTotal * unit_price */
  cumulativeAmount: number
  /** Amount this period = quantityThisPeriod * unit_price */
  amountThisPeriod: number
  /** Notes for this period */
  notes: string
  /** Whether this was manually adjusted */
  isManuallyAdjusted: boolean
  /** Period line ID (null if not yet saved) */
  periodLineId: string | null
}

/** Summary totals for a category section */
export interface CategoryTotals {
  category: FramvindaCategory
  contractTotal: number
  cumulativeQuantity: number
  percentComplete: number
  cumulativeAmount: number
  amountThisPeriod: number
}

/** Full period summary with vísitala calculation */
export interface PeriodSummary {
  subtotal: number
  grunnvisitala: number
  visitala: number
  visitalaMultiplier: number
  visitalaAmount: number
  totalWithVisitala: number
}

/** Project with contract status for the project selection page */
export interface ProjectWithFramvindaStatus {
  id: string
  name: string
  address: string | null
  company_name: string | null
  contract_id: string | null
  period_count: number
  latest_period_number: number | null
  latest_period_status: string | null
}
