import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type {
  FramvindaContract,
  FramvindaContractLine,
  FramvindaPeriod,
  FramvindaPeriodLine,
  FramvindaCategory,
} from './types'
import { FRAMVINDA_CATEGORIES, CATEGORY_LABELS } from './types'

// ============================================================
// Styles
// ============================================================

const s = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 8,
    color: '#555',
  },
  headerRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    textAlign: 'right',
  },
  // Description
  description: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: '#f9fafb',
    borderLeft: '2 solid #d4d4d8',
  },
  descriptionText: {
    fontSize: 7.5,
    color: '#374151',
    lineHeight: 1.4,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderBottom: '1 solid #d4d4d8',
    paddingVertical: 3,
    paddingHorizontal: 2,
    fontWeight: 'bold',
    fontSize: 6.5,
  },
  categoryRow: {
    flexDirection: 'row',
    backgroundColor: '#e4e4e7',
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 7.5,
    borderBottom: '0.5 solid #d4d4d8',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottom: '0.5 solid #e4e4e7',
    paddingVertical: 2,
    paddingHorizontal: 2,
    minHeight: 12,
  },
  dataRowAlt: {
    flexDirection: 'row',
    borderBottom: '0.5 solid #e4e4e7',
    paddingVertical: 2,
    paddingHorizontal: 2,
    minHeight: 12,
    backgroundColor: '#fafafa',
  },
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderBottom: '1 solid #d4d4d8',
    paddingVertical: 2,
    paddingHorizontal: 2,
    fontWeight: 'bold',
  },
  // Columns - Contract side
  colLabel: { width: '14%', paddingRight: 2 },
  colQty: { width: '7%', textAlign: 'right', paddingRight: 3 },
  colPrice: { width: '7%', textAlign: 'right', paddingRight: 3 },
  colTotal: { width: '9%', textAlign: 'right', paddingRight: 3 },
  // Cumulative side
  colCumQty: { width: '7%', textAlign: 'right', paddingRight: 3 },
  colPercent: { width: '5%', textAlign: 'right', paddingRight: 3 },
  colCumAmt: { width: '9%', textAlign: 'right', paddingRight: 3 },
  // This period
  colPeriodQty: { width: '7%', textAlign: 'right', paddingRight: 3 },
  colPeriodAmt: { width: '9%', textAlign: 'right', paddingRight: 3 },
  colNotes: { width: '13%', paddingLeft: 2 },
  colPeriodDate: { width: '13%', textAlign: 'right', paddingRight: 3 },
  // Footer
  footer: {
    marginTop: 10,
    borderTop: '1 solid #d4d4d8',
    paddingTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  footerLabel: {
    fontSize: 8,
    color: '#555',
  },
  footerValue: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTop: '1.5 solid #27272a',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  bold: { fontWeight: 'bold' },
  green: { color: '#15803d' },
  blue: { color: '#1d4ed8' },
})

// ============================================================
// Formatting helpers
// ============================================================

function fmtISK(n: number): string {
  const rounded = Math.round(n)
  if (rounded === 0) return '- kr'
  // Manual thousand separator for PDF (toLocaleString not available)
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
  // Thousand separator
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
  return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ============================================================
// Types for template
// ============================================================

interface PdfData {
  projectName: string
  companyName: string
  contract: FramvindaContract
  contractLines: FramvindaContractLine[]
  period: FramvindaPeriod
  periodLines: FramvindaPeriodLine[]
  cumulativeBefore: Record<string, number>
}

// ============================================================
// PDF Document
// ============================================================

export function FramvindaPdfDocument({
  projectName,
  companyName,
  contract,
  contractLines,
  period,
  periodLines,
  cumulativeBefore,
}: PdfData) {
  // Index period lines by contract_line_id
  const plMap = new Map(
    periodLines.map((pl) => [pl.contract_line_id, pl])
  )

  // Use period's own grunnvisitala (falls back to contract for old data)
  const periodGrunnvisitala = period.grunnvisitala ?? contract.grunnvisitala
  // Use snapshot VAT rate for finalized periods, else live contract rate
  const vatRate = period.snapshot_vat_rate ?? contract.vat_rate ?? 0

  // Pre-compute line data
  // For finalized periods, prefer snapshot data (immutable) over live contract data
  const lineData = contractLines.map((cl) => {
    const pl = plMap.get(cl.id)
    // Use snapshot values when available (finalized periods)
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

    return {
      cl,
      pl,
      qtyThisPeriod,
      cumBefore,
      cumTotal,
      pct,
      cumAmount,
      amtThisPeriod,
      effectiveUnitPrice,
      effectiveLabel,
      effectivePricingUnit,
      effectiveTotalQuantity,
      effectiveTotalPrice,
    }
  })

  // Compute totals from line data
  const periodSubtotal = lineData.reduce((sum, d) => sum + d.amtThisPeriod, 0)
  const visitalaMultiplier = period.visitala / periodGrunnvisitala
  const visitalaAmount = (visitalaMultiplier - 1) * periodSubtotal
  const totalWithVisitala = periodSubtotal + visitalaAmount

  const retainagePercentage = period.snapshot_retainage_percentage ?? contract.retainage_percentage ?? 0
  const retainageAmount = totalWithVisitala * (retainagePercentage / 100)
  const totalAfterRetainage = totalWithVisitala - retainageAmount

  const vatAmount = totalAfterRetainage * (vatRate / 100)
  const grandTotalWithVat = totalAfterRetainage + vatAmount

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>
            Verk: {companyName} / {projectName}
          </Text>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Framvinda {period.period_number}</Text>
            <Text style={s.headerSub}>
              {fmtDate(period.period_start)} — {fmtDate(period.period_end)}
            </Text>
          </View>
          <Text style={s.headerSub}>SÉRSTEYPAN EHF</Text>
        </View>

        {/* Description */}
        {period.description ? (
          <View style={s.description}>
            <Text style={s.descriptionText}>{period.description}</Text>
          </View>
        ) : null}

        {/* Table Header */}
        <View style={s.tableHeader}>
          <Text style={s.colLabel}>VERKÞÁTTUR</Text>
          <Text style={s.colQty}>MAGN</Text>
          <Text style={s.colPrice}>VERÐ*</Text>
          <Text style={s.colTotal}>SAMTALS</Text>
          <Text style={s.colCumQty}>UPPSAFN.</Text>
          <Text style={s.colPercent}>% AFGR.</Text>
          <Text style={s.colCumAmt}>RUKKAÐ*</Text>
          <Text style={s.colPeriodQty}>TÍMAB.</Text>
          <Text style={s.colPeriodAmt}>SAMTALS</Text>
          <Text style={s.colNotes}>ATHUGASEMD</Text>
        </View>

        {/* Data rows grouped by category */}
        {FRAMVINDA_CATEGORIES.map((cat) => {
          const catData = lineData.filter((d) => d.cl.category === cat)
          if (catData.length === 0) return null

          const catPeriodTotal = catData.reduce(
            (s, d) => s + d.amtThisPeriod,
            0
          )

          return (
            <View key={cat}>
              {/* Category header */}
              <View style={s.categoryRow}>
                <Text>{CATEGORY_LABELS[cat as FramvindaCategory]}</Text>
              </View>

              {/* Lines */}
              {catData.map((d, idx) => (
                <View
                  key={d.cl.id}
                  style={idx % 2 === 0 ? s.dataRow : s.dataRowAlt}
                >
                  <Text style={s.colLabel}>
                    {d.cl.is_extra ? '  Auka ' : ''}
                    {d.effectiveLabel}
                  </Text>
                  <Text style={s.colQty}>
                    {fmtNum(
                      d.effectiveTotalQuantity,
                      d.effectivePricingUnit === 'm2' ? 2 : 0
                    )}
                  </Text>
                  <Text style={s.colPrice}>
                    {fmtNum(d.effectiveUnitPrice, 0)} kr
                  </Text>
                  <Text style={s.colTotal}>{fmtISK(d.effectiveTotalPrice)}</Text>
                  <Text style={s.colCumQty}>
                    {d.cumTotal > 0
                      ? fmtNum(
                        d.cumTotal,
                        d.effectivePricingUnit === 'm2' ? 2 : 0
                      )
                      : '0'}
                  </Text>
                  <Text
                    style={[
                      s.colPercent,
                      d.pct >= 1 ? s.green : d.pct > 0 ? s.blue : {},
                    ]}
                  >
                    {fmtPct(d.pct)}
                  </Text>
                  <Text style={s.colCumAmt}>
                    {d.cumAmount > 0 ? fmtISK(d.cumAmount) : '- kr'}
                  </Text>
                  <Text style={[s.colPeriodQty, s.bold]}>
                    {d.qtyThisPeriod > 0
                      ? fmtNum(
                        d.qtyThisPeriod,
                        d.effectivePricingUnit === 'm2' ? 2 : 0
                      )
                      : ''}
                  </Text>
                  <Text style={[s.colPeriodAmt, s.bold]}>
                    {d.amtThisPeriod > 0 ? fmtISK(d.amtThisPeriod) : ''}
                  </Text>
                  <Text style={s.colNotes}>
                    {d.pl?.notes ?? ''}
                  </Text>
                </View>
              ))}

              {/* Category subtotal */}
              <View style={s.subtotalRow}>
                <Text style={s.colLabel}>
                  {CATEGORY_LABELS[cat as FramvindaCategory]} samtals
                </Text>
                <Text style={s.colQty}></Text>
                <Text style={s.colPrice}></Text>
                <Text style={s.colTotal}></Text>
                <Text style={s.colCumQty}></Text>
                <Text style={s.colPercent}></Text>
                <Text style={s.colCumAmt}></Text>
                <Text style={s.colPeriodQty}></Text>
                <Text style={[s.colPeriodAmt, s.bold]}>
                  {catPeriodTotal > 0 ? fmtISK(catPeriodTotal) : ''}
                </Text>
                <Text style={s.colNotes}></Text>
              </View>
            </View>
          )
        })}

        {/* Footer with totals */}
        <View style={s.footer}>
          <View style={s.footerRow}>
            <Text style={s.footerLabel}>Samtals</Text>
            <Text style={s.footerValue}>{fmtISK(periodSubtotal)}</Text>
          </View>
          <View style={s.footerRow}>
            <Text style={s.footerLabel}>
              Vísitala (Grunnvísitala {fmtNum(periodGrunnvisitala, 1)} →{' '}
              {fmtNum(period.visitala, 1)})
            </Text>
            <Text style={s.footerValue}>{fmtISK(visitalaAmount)}</Text>
          </View>
          <View style={s.footerRow}>
            <Text style={s.footerLabel}>Samtals m/vísitölu</Text>
            <Text style={s.footerValue}>{fmtISK(totalWithVisitala)}</Text>
          </View>
          {retainagePercentage > 0 && (
            <View style={s.footerRow}>
              <Text style={s.footerLabel}>Tryggingarfé ({fmtNum(retainagePercentage, 0)}%)</Text>
              <Text style={[s.footerValue, { color: '#dc2626' }]}>-{fmtISK(retainageAmount)}</Text>
            </View>
          )}
          {vatRate > 0 && (
            <View style={s.footerRow}>
              <Text style={s.footerLabel}>VSK ({fmtNum(vatRate, 0)}%)</Text>
              <Text style={s.footerValue}>{fmtISK(vatAmount)}</Text>
            </View>
          )}
          <View style={s.grandTotal}>
            <Text style={s.grandTotalLabel}>Heildarupphæð m/vsk</Text>
            <Text style={s.grandTotalValue}>
              {fmtISK(vatRate > 0 ? grandTotalWithVat : totalAfterRetainage)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
