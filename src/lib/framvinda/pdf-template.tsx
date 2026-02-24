import { Document, Page, Text, View, StyleSheet, Svg, Rect } from '@react-pdf/renderer'
import type {
  FramvindaContract,
  FramvindaContractLine,
  FramvindaPeriod,
  FramvindaPeriodLine,
  FramvindaCategory,
} from './types'
import { FRAMVINDA_CATEGORIES, CATEGORY_LABELS, PRICING_UNIT_LABELS } from './types'
import type { PricingUnit } from './types'

// ============================================================
// Color palette
// ============================================================

const COLORS = {
  // Primary
  blue: '#2563eb',
  blueDark: '#1e40af',
  blueLight: '#dbeafe',
  // Status
  green: '#16a34a',
  greenLight: '#dcfce7',
  amber: '#d97706',
  amberLight: '#fef3c7',
  red: '#dc2626',
  // Neutrals
  zinc900: '#18181b',
  zinc800: '#27272a',
  zinc700: '#3f3f46',
  zinc600: '#52525b',
  zinc500: '#71717a',
  zinc400: '#a1a1aa',
  zinc300: '#d4d4d8',
  zinc200: '#e4e4e7',
  zinc100: '#f4f4f5',
  zinc50: '#fafafa',
  white: '#ffffff',
}

// ============================================================
// Styles
// ============================================================

const s = StyleSheet.create({
  // Page
  page: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 24,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: COLORS.zinc800,
  },

  // ── Fixed header ──────────────────────────────────
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 24,
    borderBottom: `2 solid ${COLORS.blue}`,
    backgroundColor: COLORS.white,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {},
  headerRight: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  headerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: COLORS.zinc500,
    marginBottom: 2,
  },
  headerProject: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.zinc900,
  },
  headerCompany: {
    fontSize: 8,
    color: COLORS.zinc600,
    marginTop: 1,
  },
  headerAddress: {
    fontSize: 7,
    color: COLORS.zinc400,
    marginTop: 1,
  },
  headerPeriod: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.zinc900,
  },
  headerDate: {
    fontSize: 8,
    color: COLORS.zinc500,
    marginTop: 2,
  },

  // ── Fixed footer ──────────────────────────────────
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderTop: `0.5 solid ${COLORS.zinc200}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
  },
  footerText: {
    fontSize: 6.5,
    color: COLORS.zinc400,
  },

  // ── Executive summary ─────────────────────────────
  summarySection: {
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.zinc500,
    letterSpacing: 1,
    marginBottom: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    padding: 8,
    backgroundColor: COLORS.zinc50,
    borderRadius: 3,
    border: `0.5 solid ${COLORS.zinc200}`,
  },
  kpiLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    color: COLORS.zinc500,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.zinc900,
    marginBottom: 4,
  },
  kpiPercent: {
    fontSize: 7,
    color: COLORS.zinc600,
    marginTop: 2,
  },

  // ── Category progress ─────────────────────────────
  catProgressSection: {
    marginBottom: 12,
  },
  catProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  catProgressLabel: {
    width: 70,
    fontSize: 7,
    color: COLORS.zinc700,
  },
  catProgressBarWrap: {
    flex: 1,
    marginHorizontal: 6,
  },
  catProgressPct: {
    width: 35,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // ── Description ───────────────────────────────────
  description: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: COLORS.zinc50,
    borderLeft: `2 solid ${COLORS.zinc300}`,
    borderRadius: 2,
  },
  descriptionLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    color: COLORS.zinc400,
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 7.5,
    color: COLORS.zinc700,
    lineHeight: 1.5,
  },

  // ── Table ─────────────────────────────────────────
  tableSection: {
    marginBottom: 10,
  },
  tableSectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.zinc500,
    letterSpacing: 1,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.zinc800,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  tableHeaderText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
    color: COLORS.white,
  },
  categoryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.zinc100,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: `0.5 solid ${COLORS.zinc300}`,
    borderLeft: `2 solid ${COLORS.blue}`,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.zinc800,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottom: `0.5 solid ${COLORS.zinc200}`,
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    minHeight: 13,
  },
  dataRowAlt: {
    flexDirection: 'row',
    borderBottom: `0.5 solid ${COLORS.zinc200}`,
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    minHeight: 13,
    backgroundColor: COLORS.zinc50,
  },
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.zinc100,
    borderBottom: `1 solid ${COLORS.zinc300}`,
    borderTop: `0.5 solid ${COLORS.zinc300}`,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },

  // Table columns — AIA G703-inspired financial flow
  // Contract (1-4) → Billing history (5-6) → Status (7-8) → Progress (9) → Notes (10)
  colLabel: { width: '15%', paddingRight: 2 },
  colQty: { width: '5%', textAlign: 'right' as const, paddingRight: 2 },
  colPrice: { width: '5%', textAlign: 'right' as const, paddingRight: 2 },
  colContract: { width: '9%', textAlign: 'right' as const, paddingRight: 2 },
  colPrevBilled: { width: '9%', textAlign: 'right' as const, paddingRight: 2 },
  colThisPeriod: { width: '9%', textAlign: 'right' as const, paddingRight: 2 },
  colBilledTotal: { width: '9%', textAlign: 'right' as const, paddingRight: 2 },
  colBalance: { width: '9%', textAlign: 'right' as const, paddingRight: 2 },
  colPercent: { width: '7%', textAlign: 'right' as const, paddingRight: 2 },
  colNotes: { width: '7%', paddingLeft: 2 },

  // Sub-text styles for secondary info
  labelItemDetail: {
    fontSize: 5.5,
    color: COLORS.zinc400,
    marginTop: 0.5,
  },
  periodQtySubtext: {
    fontSize: 5.5,
    color: COLORS.zinc400,
    marginTop: 1,
  },

  // ── Totals footer ────────────────────────────────
  totalsSection: {
    marginTop: 6,
    paddingTop: 8,
    borderTop: `1 solid ${COLORS.zinc300}`,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  totalsRowIndented: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 4,
    paddingLeft: 16,
    backgroundColor: COLORS.zinc50,
  },
  totalsLabel: {
    fontSize: 8,
    color: COLORS.zinc700,
  },
  totalsLabelIndented: {
    fontSize: 7.5,
    color: COLORS.zinc500,
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right' as const,
  },
  totalsValueIndented: {
    fontSize: 8,
    textAlign: 'right' as const,
    color: COLORS.zinc600,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: COLORS.zinc900,
    borderRadius: 3,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textAlign: 'right' as const,
  },

  // ── Utility ───────────────────────────────────────
  bold: { fontFamily: 'Helvetica-Bold' },
  green: { color: COLORS.green },
  blue: { color: COLORS.blue },
  amber: { color: COLORS.amber },
  red: { color: COLORS.red },
})

// ============================================================
// Formatting helpers
// ============================================================

function fmtISK(n: number): string {
  const rounded = Math.round(n)
  if (rounded === 0) return '- kr'
  const str = Math.abs(rounded).toString()
  const parts = []
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i))
  }
  const formatted = parts.join('.')
  return (rounded < 0 ? '-' : '') + formatted + ' kr'
}

function fmtNum(n: number, decimals = 2): string {
  if (n === 0) return '0'
  const fixed = n.toFixed(decimals)
  const [whole, dec] = fixed.split('.')
  const parts = []
  for (let i = whole.length; i > 0; i -= 3) {
    parts.unshift(whole.slice(Math.max(0, i - 3), i))
  }
  return parts.join('.') + (dec ? ',' + dec : '')
}

function fmtPct(n: number): string {
  return Math.round(n * 100) + '%'
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateShort(): string {
  return new Date().toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ============================================================
// SVG Progress Bar Component
// ============================================================

function ProgressBar({
  percent,
  width,
  height,
  bgColor = COLORS.zinc200,
  fillColor,
}: {
  percent: number
  width: number
  height: number
  bgColor?: string
  fillColor: string
}) {
  const clampedPct = Math.max(0, Math.min(1, percent))
  const fillWidth = Math.round(clampedPct * width)

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} rx={height / 2} fill={bgColor} />
      {fillWidth > 0 && (
        <Rect x={0} y={0} width={fillWidth} height={height} rx={height / 2} fill={fillColor} />
      )}
    </Svg>
  )
}

// ============================================================
// Types
// ============================================================

interface PdfData {
  projectName: string
  companyName: string
  projectAddress?: string | null
  companyKennitala?: string | null
  contract: FramvindaContract
  contractLines: FramvindaContractLine[]
  period: FramvindaPeriod
  periodLines: FramvindaPeriodLine[]
  cumulativeBefore: Record<string, number>
}

interface LineDataItem {
  cl: FramvindaContractLine
  pl: FramvindaPeriodLine | undefined
  qtyThisPeriod: number
  cumBefore: number
  cumTotal: number
  pct: number
  cumAmount: number
  amtThisPeriod: number
  /** AIA Col D: Amount billed in all prior periods */
  prevBilledAmount: number
  /** AIA Col H: Contract total minus total billed to date */
  balanceToFinish: number
  effectiveUnitPrice: number
  effectiveLabel: string
  effectivePricingUnit: string
  effectiveTotalQuantity: number
  effectiveTotalPrice: number
}

interface CategorySummary {
  category: string
  label: string
  contractTotal: number
  prevBilledAmount: number
  cumBilledAmount: number
  periodAmount: number
  balanceToFinish: number
  pct: number
}

// ============================================================
// PDF Document
// ============================================================

export function FramvindaPdfDocument({
  projectName,
  companyName,
  projectAddress,
  companyKennitala,
  contract,
  contractLines,
  period,
  periodLines,
  cumulativeBefore,
}: PdfData) {
  // Index period lines
  const plMap = new Map(
    periodLines.map((pl) => [pl.contract_line_id, pl])
  )

  const periodGrunnvisitala = period.grunnvisitala ?? contract.grunnvisitala
  const vatRate = period.snapshot_vat_rate ?? contract.vat_rate ?? 0

  // Pre-compute line data
  const lineData: LineDataItem[] = contractLines.map((cl) => {
    const pl = plMap.get(cl.id)
    const effectiveUnitPrice = pl?.snapshot_unit_price ?? cl.unit_price
    const effectiveLabel = pl?.snapshot_label ?? cl.label
    const effectivePricingUnit = pl?.snapshot_pricing_unit ?? cl.pricing_unit
    const effectiveTotalQuantity = pl?.snapshot_total_quantity ?? cl.total_quantity
    const effectiveTotalPrice = effectiveTotalQuantity * effectiveUnitPrice

    const qtyThisPeriod = pl?.quantity_this_period ?? 0
    const cumBefore = cumulativeBefore[cl.id] ?? 0
    const cumTotal = cumBefore + qtyThisPeriod
    const pct = effectiveTotalQuantity > 0 ? cumTotal / effectiveTotalQuantity : 0
    const cumAmount = cumTotal * effectiveUnitPrice
    const amtThisPeriod = qtyThisPeriod * effectiveUnitPrice
    const prevBilledAmount = cumBefore * effectiveUnitPrice
    const balanceToFinish = effectiveTotalPrice - cumAmount

    return {
      cl, pl, qtyThisPeriod, cumBefore, cumTotal, pct,
      cumAmount, amtThisPeriod, prevBilledAmount, balanceToFinish,
      effectiveUnitPrice, effectiveLabel,
      effectivePricingUnit, effectiveTotalQuantity, effectiveTotalPrice,
    }
  })

  // Totals
  const contractGrandTotal = lineData.reduce((sum, d) => sum + d.effectiveTotalPrice, 0)
  const cumulativeBilledTotal = lineData.reduce((sum, d) => sum + d.cumAmount, 0)
  const periodSubtotal = lineData.reduce((sum, d) => sum + d.amtThisPeriod, 0)
  const remainingTotal = contractGrandTotal - cumulativeBilledTotal
  const overallPct = contractGrandTotal > 0 ? cumulativeBilledTotal / contractGrandTotal : 0

  // Visitala
  const visitalaMultiplier = period.visitala / periodGrunnvisitala
  const visitalaAmount = (visitalaMultiplier - 1) * periodSubtotal
  const totalWithVisitala = periodSubtotal + visitalaAmount
  const retainagePercentage = period.snapshot_retainage_percentage ?? contract.retainage_percentage ?? 0
  const retainageAmount = totalWithVisitala * (retainagePercentage / 100)
  const totalAfterRetainage = totalWithVisitala - retainageAmount
  const vatAmount = totalAfterRetainage * (vatRate / 100)
  const grandTotalWithVat = totalAfterRetainage + vatAmount

  // Category summaries
  const categorySummaries: CategorySummary[] = []
  for (const cat of FRAMVINDA_CATEGORIES) {
    const catLines = lineData.filter((d) => d.cl.category === cat)
    if (catLines.length === 0) continue
    const contractTotal = catLines.reduce((sum, d) => sum + d.effectiveTotalPrice, 0)
    const prevBilledAmount = catLines.reduce((sum, d) => sum + d.prevBilledAmount, 0)
    const cumBilledAmount = catLines.reduce((sum, d) => sum + d.cumAmount, 0)
    const periodAmount = catLines.reduce((sum, d) => sum + d.amtThisPeriod, 0)
    const balanceToFinish = contractTotal - cumBilledAmount
    const pct = contractTotal > 0 ? cumBilledAmount / contractTotal : 0
    categorySummaries.push({
      category: cat,
      label: CATEGORY_LABELS[cat as FramvindaCategory],
      contractTotal, prevBilledAmount, cumBilledAmount, periodAmount, balanceToFinish, pct,
    })
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        {/* ── Fixed Header (repeats every page) ── */}
        <View style={s.fixedHeader} fixed>
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.headerBrand}>SÉRSTEYPAN EHF</Text>
              <Text style={s.headerProject}>{projectName}</Text>
              <Text style={s.headerCompany}>
                {companyName}
                {companyKennitala ? ` (kt. ${companyKennitala})` : ''}
              </Text>
              {projectAddress ? (
                <Text style={s.headerAddress}>{projectAddress}</Text>
              ) : null}
            </View>
            <View style={s.headerRight}>
              <Text style={s.headerPeriod}>Framvinda {period.period_number}</Text>
              <Text style={s.headerDate}>
                {fmtDate(period.period_start)} — {fmtDate(period.period_end)}
              </Text>
              <Text
                style={s.headerDate}
                render={({ pageNumber, totalPages }) =>
                  `Síða ${pageNumber} / ${totalPages}`
                }
              />
            </View>
          </View>
        </View>

        {/* ── Executive Summary ── */}
        <View style={s.summarySection}>
          <Text style={s.summaryTitle}>VERKEFNISYFIRLIT</Text>
          <View style={s.kpiRow}>
            {/* Contract total */}
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>SAMNINGUR</Text>
              <Text style={s.kpiValue}>{fmtISK(contractGrandTotal)}</Text>
              <ProgressBar
                percent={1}
                width={140}
                height={5}
                fillColor={COLORS.blue}
              />
              <Text style={s.kpiPercent}>Heildarsamningur</Text>
            </View>
            {/* Cumulative billed */}
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>RUKKAÐ SAMTALS</Text>
              <Text style={[s.kpiValue, { color: COLORS.green }]}>
                {fmtISK(cumulativeBilledTotal)}
              </Text>
              <ProgressBar
                percent={overallPct}
                width={140}
                height={5}
                fillColor={COLORS.green}
              />
              <Text style={s.kpiPercent}>{fmtPct(overallPct)} af samningi</Text>
            </View>
            {/* This period */}
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>ÞETTA TÍMABIL</Text>
              <Text style={[s.kpiValue, { color: COLORS.amber }]}>
                {fmtISK(periodSubtotal)}
              </Text>
              <ProgressBar
                percent={contractGrandTotal > 0 ? periodSubtotal / contractGrandTotal : 0}
                width={140}
                height={5}
                fillColor={COLORS.amber}
              />
              <Text style={s.kpiPercent}>
                {contractGrandTotal > 0
                  ? fmtPct(periodSubtotal / contractGrandTotal)
                  : '0%'}{' '}
                af samningi
              </Text>
            </View>
            {/* Remaining */}
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>EFTIRSTÖÐVAR</Text>
              <Text style={s.kpiValue}>{fmtISK(remainingTotal)}</Text>
              <ProgressBar
                percent={contractGrandTotal > 0 ? Math.max(0, remainingTotal) / contractGrandTotal : 0}
                width={140}
                height={5}
                fillColor={COLORS.zinc400}
              />
              <Text style={s.kpiPercent}>
                {contractGrandTotal > 0
                  ? fmtPct(Math.max(0, remainingTotal) / contractGrandTotal)
                  : '0%'}{' '}
                eftir
              </Text>
            </View>
          </View>
        </View>

        {/* ── Category Progress Bars ── */}
        {categorySummaries.length > 1 && (
          <View style={s.catProgressSection}>
            <Text style={s.summaryTitle}>FRAMVINDA EFTIR FLOKKUM</Text>
            {categorySummaries.map((cat) => (
              <View key={cat.category} style={s.catProgressRow}>
                <Text style={s.catProgressLabel}>{cat.label}</Text>
                <View style={s.catProgressBarWrap}>
                  <ProgressBar
                    percent={cat.pct}
                    width={500}
                    height={6}
                    fillColor={cat.pct >= 1 ? COLORS.green : cat.pct > 0.5 ? COLORS.blue : COLORS.amber}
                  />
                </View>
                <Text
                  style={[
                    s.catProgressPct,
                    cat.pct >= 1 ? s.green : cat.pct > 0.5 ? s.blue : s.amber,
                  ]}
                >
                  {fmtPct(cat.pct)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Description ── */}
        {period.description ? (
          <View style={s.description}>
            <Text style={s.descriptionLabel}>LÝSING</Text>
            <Text style={s.descriptionText}>{period.description}</Text>
          </View>
        ) : null}

        {/* ── Line Items Table ── */}
        <View style={s.tableSection}>
          <Text style={s.summaryTitle}>SUNDURLIÐUN</Text>

          {/* Table header — AIA G703 financial flow */}
          <View style={s.tableHeader} fixed>
            <Text style={[s.tableHeaderText, s.colLabel]}>VERKÞÁTTUR</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>MAGN</Text>
            <Text style={[s.tableHeaderText, s.colPrice]}>VERÐ</Text>
            <Text style={[s.tableHeaderText, s.colContract]}>SAMNINGSVERÐ</Text>
            <Text style={[s.tableHeaderText, s.colPrevBilled]}>ÁÐUR RUKKAÐ</Text>
            <Text style={[s.tableHeaderText, s.colThisPeriod]}>ÞETTA TÍMABIL</Text>
            <Text style={[s.tableHeaderText, s.colBilledTotal]}>SAMTALS RUKKAÐ</Text>
            <Text style={[s.tableHeaderText, s.colBalance]}>EFTIRSTÖÐVAR</Text>
            <Text style={[s.tableHeaderText, s.colPercent]}>%</Text>
            <Text style={[s.tableHeaderText, s.colNotes]}>ATH.</Text>
          </View>

          {/* Data rows grouped by category */}
          {FRAMVINDA_CATEGORIES.map((cat) => {
            const catData = lineData.filter((d) => d.cl.category === cat)
            if (catData.length === 0) return null

            const catContractTotal = catData.reduce((sum, d) => sum + d.effectiveTotalPrice, 0)
            const catPrevBilled = catData.reduce((sum, d) => sum + d.prevBilledAmount, 0)
            const catCumTotal = catData.reduce((sum, d) => sum + d.cumAmount, 0)
            const catPeriodTotal = catData.reduce((sum, d) => sum + d.amtThisPeriod, 0)
            const catBalance = catContractTotal - catCumTotal
            const catPct = catContractTotal > 0 ? catCumTotal / catContractTotal : 0

            return (
              <View key={cat} wrap={false}>
                {/* Category header */}
                <View style={s.categoryRow}>
                  <Text style={s.categoryText}>
                    {CATEGORY_LABELS[cat as FramvindaCategory]}
                  </Text>
                </View>

                {/* Lines */}
                {catData.map((d, idx) => {
                  const isOverBilled = d.pct > 1
                  const pctColor = isOverBilled
                    ? COLORS.red
                    : d.pct >= 1
                    ? COLORS.green
                    : d.pct > 0.5
                    ? COLORS.blue
                    : d.pct > 0
                    ? COLORS.amber
                    : COLORS.zinc400

                  // Item detail: show contract_count × unit_area when available
                  const hasItemDetail = d.cl.contract_count != null
                    && d.cl.contract_count > 1
                    && d.cl.unit_area_m2 != null
                  const unitLabel = PRICING_UNIT_LABELS[d.effectivePricingUnit as PricingUnit] ?? d.effectivePricingUnit

                  // Balance color: red if over-billed, green if zero (fully billed)
                  const balanceColor = d.balanceToFinish < 0
                    ? COLORS.red
                    : d.balanceToFinish === 0 && d.cumAmount > 0
                    ? COLORS.green
                    : COLORS.zinc800

                  return (
                    <View
                      key={d.cl.id}
                      style={idx % 2 === 0 ? s.dataRow : s.dataRowAlt}
                    >
                      {/* VERKÞÁTTUR — enhanced with item detail */}
                      <View style={s.colLabel}>
                        <Text>
                          {d.cl.is_extra ? '  ↳ ' : ''}
                          {d.effectiveLabel}
                        </Text>
                        {hasItemDetail ? (
                          <Text style={s.labelItemDetail}>
                            {d.cl.contract_count} stk × {fmtNum(d.cl.unit_area_m2!, 2)} {unitLabel}
                          </Text>
                        ) : null}
                      </View>
                      {/* MAGN — contract quantity */}
                      <Text style={s.colQty}>
                        {fmtNum(d.effectiveTotalQuantity, d.effectivePricingUnit === 'm2' ? 2 : 0)}
                      </Text>
                      {/* VERÐ — unit price */}
                      <Text style={s.colPrice}>
                        {fmtNum(d.effectiveUnitPrice, 0)}
                      </Text>
                      {/* SAMNINGSVERÐ — contract total */}
                      <Text style={s.colContract}>
                        {fmtISK(d.effectiveTotalPrice)}
                      </Text>
                      {/* ÁÐUR RUKKAÐ — previously billed (AIA Col D) */}
                      <Text style={s.colPrevBilled}>
                        {d.prevBilledAmount > 0 ? fmtISK(d.prevBilledAmount) : '- kr'}
                      </Text>
                      {/* ÞETTA TÍMABIL — this period amount + qty sub-text */}
                      <View style={s.colThisPeriod}>
                        <Text style={[{ textAlign: 'right' as const }, d.amtThisPeriod > 0 ? s.bold : {}]}>
                          {d.amtThisPeriod > 0 ? fmtISK(d.amtThisPeriod) : ''}
                        </Text>
                        {d.qtyThisPeriod > 0 ? (
                          <Text style={[s.periodQtySubtext, { textAlign: 'right' as const }]}>
                            {fmtNum(d.qtyThisPeriod, d.effectivePricingUnit === 'm2' ? 2 : 0)} {unitLabel}
                          </Text>
                        ) : null}
                      </View>
                      {/* SAMTALS RUKKAÐ — total billed to date (AIA Col G) */}
                      <Text style={s.colBilledTotal}>
                        {d.cumAmount > 0 ? fmtISK(d.cumAmount) : '- kr'}
                      </Text>
                      {/* EFTIRSTÖÐVAR — balance to finish (AIA Col H) */}
                      <Text style={[s.colBalance, { color: balanceColor }]}>
                        {d.balanceToFinish !== 0 ? fmtISK(d.balanceToFinish) : fmtISK(0)}
                      </Text>
                      {/* % — progress with mini bar */}
                      <View style={[s.colPercent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }]}>
                        <ProgressBar
                          percent={d.pct}
                          width={24}
                          height={4}
                          fillColor={pctColor}
                        />
                        <Text style={{ fontSize: 6.5, color: pctColor, fontFamily: isOverBilled ? 'Helvetica-Bold' : 'Helvetica' }}>
                          {fmtPct(d.pct)}{isOverBilled ? '!' : ''}
                        </Text>
                      </View>
                      {/* ATH. — notes */}
                      <Text style={s.colNotes}>
                        {d.pl?.notes ?? ''}
                      </Text>
                    </View>
                  )
                })}

                {/* Category subtotal — full financial summary */}
                <View style={s.subtotalRow}>
                  <Text style={[s.colLabel, s.bold]}>
                    {CATEGORY_LABELS[cat as FramvindaCategory]} samtals
                  </Text>
                  <Text style={s.colQty} />
                  <Text style={s.colPrice} />
                  <Text style={[s.colContract, s.bold]}>{fmtISK(catContractTotal)}</Text>
                  <Text style={[s.colPrevBilled, s.bold]}>
                    {catPrevBilled > 0 ? fmtISK(catPrevBilled) : '- kr'}
                  </Text>
                  <Text style={[s.colThisPeriod, s.bold]}>
                    {catPeriodTotal > 0 ? fmtISK(catPeriodTotal) : ''}
                  </Text>
                  <Text style={[s.colBilledTotal, s.bold]}>{fmtISK(catCumTotal)}</Text>
                  <Text style={[s.colBalance, s.bold, { color: catBalance < 0 ? COLORS.red : catBalance === 0 && catCumTotal > 0 ? COLORS.green : COLORS.zinc800 }]}>
                    {fmtISK(catBalance)}
                  </Text>
                  <View style={[s.colPercent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }]}>
                    <ProgressBar
                      percent={catPct}
                      width={24}
                      height={4}
                      fillColor={catPct >= 1 ? COLORS.green : catPct > 0.5 ? COLORS.blue : COLORS.amber}
                    />
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: catPct >= 1 ? COLORS.green : catPct > 0.5 ? COLORS.blue : COLORS.amber }}>
                      {fmtPct(catPct)}
                    </Text>
                  </View>
                  <Text style={s.colNotes} />
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Totals Footer ── */}
        <View style={s.totalsSection} wrap={false}>
          {/* Subtotal */}
          <View style={s.totalsRow}>
            <Text style={[s.totalsLabel, s.bold]}>Samtals (þetta tímabil)</Text>
            <Text style={s.totalsValue}>{fmtISK(periodSubtotal)}</Text>
          </View>

          {/* Visitala */}
          <View style={s.totalsRowIndented}>
            <Text style={s.totalsLabelIndented}>
              Vísitala (Grunnvísitala {fmtNum(periodGrunnvisitala, 1)} →{' '}
              {fmtNum(period.visitala, 1)})
            </Text>
            <Text style={s.totalsValueIndented}>{fmtISK(visitalaAmount)}</Text>
          </View>

          {/* Total with visitala */}
          <View style={s.totalsRow}>
            <Text style={[s.totalsLabel, s.bold]}>Samtals m/vísitölu</Text>
            <Text style={s.totalsValue}>{fmtISK(totalWithVisitala)}</Text>
          </View>

          {/* Retainage */}
          {retainagePercentage > 0 && (
            <View style={s.totalsRowIndented}>
              <Text style={s.totalsLabelIndented}>
                Tryggingarfé ({fmtNum(retainagePercentage, 0)}%)
              </Text>
              <Text style={[s.totalsValueIndented, s.red]}>
                −{fmtISK(retainageAmount)}
              </Text>
            </View>
          )}

          {/* VAT */}
          {vatRate > 0 && (
            <View style={s.totalsRowIndented}>
              <Text style={s.totalsLabelIndented}>
                VSK ({fmtNum(vatRate, 0)}%)
              </Text>
              <Text style={s.totalsValueIndented}>{fmtISK(vatAmount)}</Text>
            </View>
          )}

          {/* Grand total — dark prominent bar */}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Heildarupphæð m/vsk</Text>
            <Text style={s.grandTotalValue}>
              {fmtISK(vatRate > 0 ? grandTotalWithVat : totalAfterRetainage)}
            </Text>
          </View>
        </View>

        {/* ── Fixed Page Footer (repeats every page) ── */}
        <View style={s.fixedFooter} fixed>
          <Text style={s.footerText}>
            Framvindayfirliti búið til: {fmtDateShort()} · Sérsteypan ehf
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Síða ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
