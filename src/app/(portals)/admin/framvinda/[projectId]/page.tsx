import {
  getContract,
  getContractLines,
  getPeriods,
  getProjectForFramvinda,
  getCumulativeForAllPeriods,
  getRevisions,
} from '@/lib/framvinda/queries'
import { formatISK } from '@/lib/framvinda/calculations'
import {
  FRAMVINDA_CATEGORIES,
  CATEGORY_LABELS,
  type FramvindaCategory,
} from '@/lib/framvinda/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Settings, FileText, Lock, Pencil } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FramvindaNewPeriodForm } from '@/components/framvinda/NewPeriodForm'
import { ProgressSummary } from '@/components/framvinda/ProgressSummary'
import { KpiCards } from '@/components/framvinda/KpiCards'
import { CategoryProgressChart } from '@/components/framvinda/CategoryProgressChart'
import { BillingTrendChart } from '@/components/framvinda/BillingTrendChart'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function FramvindaProjectPage({ params }: PageProps) {
  const { projectId } = await params
  const project = await getProjectForFramvinda(projectId)

  if (!project) redirect('/admin/framvinda')

  const contract = await getContract(projectId)

  if (!contract) {
    redirect(`/admin/framvinda/${projectId}/setup`)
  }

  const [lines, periods, cumulativeMap, revisions] = await Promise.all([
    getContractLines(contract.id),
    getPeriods(contract.id),
    getCumulativeForAllPeriods(contract.id),
    getRevisions(contract.id),
  ])

  // Convert Map to Record for client component
  const cumulativeRecord: Record<string, number> = {}
  for (const [key, value] of cumulativeMap) {
    cumulativeRecord[key] = value
  }

  // Filter lines to only include Base + Approved revisions
  const approvedRevisionIds = new Set(
    revisions.filter((r) => r.status === 'approved').map((r) => r.id)
  )
  const activeLines = lines.filter(
    (l) =>
      l.revision_id === null ||
      (l.revision_id && approvedRevisionIds.has(l.revision_id))
  )

  // Calculate contract totals
  let contractGrandTotal = 0
  for (const line of activeLines) {
    contractGrandTotal += line.total_price
  }

  // KPI data: compute billing progress
  const lineProgress = activeLines.map((cl) => {
    const produced = cumulativeRecord[cl.id] ?? 0
    const producedAmount = produced * cl.unit_price
    return { cl, produced, producedAmount }
  })
  const billedAmount = lineProgress.reduce((s, l) => s + l.producedAmount, 0)
  const remainingAmount = contractGrandTotal - billedAmount
  const percentComplete =
    contractGrandTotal > 0 ? billedAmount / contractGrandTotal : 0

  // Category progress chart data
  const categoryProgressData = FRAMVINDA_CATEGORIES.map((cat) => {
    const catLines = lineProgress.filter((l) => l.cl.category === cat)
    if (catLines.length === 0) return null
    const catContractTotal = catLines.reduce(
      (s, l) => s + l.cl.total_price,
      0
    )
    const catBilledAmount = catLines.reduce(
      (s, l) => s + l.producedAmount,
      0
    )
    const catPercent =
      catContractTotal > 0
        ? Math.round((catBilledAmount / catContractTotal) * 100)
        : 0
    return {
      category: CATEGORY_LABELS[cat as FramvindaCategory],
      contractTotal: catContractTotal,
      billedAmount: catBilledAmount,
      remaining: Math.max(0, catContractTotal - catBilledAmount),
      percent: catPercent,
    }
  }).filter((d): d is NonNullable<typeof d> => d !== null)

  // Billing trend chart data (from finalized periods)
  const finalizedPeriods = periods
    .filter((p) => p.status === 'finalized')
    .sort((a, b) => a.period_number - b.period_number)

  const billingTrendData = finalizedPeriods.reduce<
    Array<{ period: string; periodAmount: number; cumulativeAmount: number }>
  >((acc, p) => {
    const amount = p.total_with_visitala ?? p.subtotal ?? 0
    const cumulative = (acc[acc.length - 1]?.cumulativeAmount ?? 0) + amount
    acc.push({
      period: `Framv. ${p.period_number}`,
      periodAmount: amount,
      cumulativeAmount: cumulative,
    })
    return acc
  }, [])

  const companyName =
    (project.companies as { name: string; kennitala: string } | null)?.name ??
    ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Framvinda — {project.name}
          </h1>
          <p className="text-zinc-600 mt-1">
            {companyName}
            {project.address ? ` · ${project.address}` : ''}
          </p>
        </div>
        {contract.is_frozen ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/framvinda/${projectId}/setup`}>
              <Settings className="mr-1 h-3.5 w-3.5" />
              Skoða samning
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/framvinda/${projectId}/setup`}>
              <Settings className="mr-1 h-3.5 w-3.5" />
              Breyta samningi
            </Link>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <KpiCards
        contractTotal={contractGrandTotal}
        billedAmount={billedAmount}
        remainingAmount={remainingAmount}
        percentComplete={percentComplete}
      />

      {/* Charts */}
      {(categoryProgressData.length > 0 || billingTrendData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Framvinda eftir flokkum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryProgressChart data={categoryProgressData} />
            </CardContent>
          </Card>
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Uppsafnaður reikningur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BillingTrendChart data={billingTrendData} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compact contract summary */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Heildarsamningur
                </p>
                <p className="text-xl font-bold text-zinc-900 tabular-nums">
                  {formatISK(contractGrandTotal)}
                </p>
              </div>
              <div className="h-8 w-px bg-zinc-200" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Grunnvísitala
                </p>
                <p className="text-lg font-semibold text-zinc-700 tabular-nums">
                  {contract.grunnvisitala}
                </p>
              </div>
              {contract.is_frozen && (
                <>
                  <div className="h-8 w-px bg-zinc-200" />
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <Lock className="mr-1 h-3 w-3" />
                    Samningur frystur
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary (detail table) */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Framvindayfirlit
        </h2>
        <ProgressSummary
          contractLines={activeLines}
          cumulative={cumulativeRecord}
        />
      </div>

      {/* Revisions (Viðbætur) — less prominent position */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Viðbætur</h2>
          {contract.is_frozen && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/framvinda/${projectId}/revisions/new`}>
                <Settings className="mr-1 h-3.5 w-3.5" />
                Stofna Viðbót
              </Link>
            </Button>
          )}
        </div>

        {revisions.length > 0 ? (
          <Card className="border-zinc-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                    Heiti
                  </TableHead>
                  <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                    Staða
                  </TableHead>
                  <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                    Aðgerðir
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisions.map((rev) => (
                  <TableRow key={rev.id} className="hover:bg-zinc-50">
                    <TableCell className="py-3 font-medium">
                      {rev.name}
                    </TableCell>
                    <TableCell className="py-3">
                      {rev.status === 'approved' ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700"
                        >
                          Samþykkt
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700"
                        >
                          Í vinnslu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/framvinda/${projectId}/revisions/${rev.id}`}
                        >
                          <Settings className="mr-1 h-3 w-3" />
                          Skoða / Breyta
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="py-8 text-center text-zinc-500 text-sm">
              {!contract.is_frozen
                ? 'Samningur þarf að vera frystur (fyrsta uppgjör samþykkt) áður en viðbætur eru stofnaðar.'
                : 'Engar viðbætur (Change Orders) skráðar.'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Periods */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Tímabil</h2>

        <FramvindaNewPeriodForm
          contractId={contract.id}
          projectId={projectId}
          nextPeriodNumber={
            (periods[periods.length - 1]?.period_number ?? 0) + 1
          }
          defaultVisitala={
            periods[periods.length - 1]?.visitala ?? contract.grunnvisitala
          }
          defaultGrunnvisitala={
            periods[periods.length - 1]?.grunnvisitala ??
            contract.grunnvisitala
          }
        />

        {periods.length > 0 ? (
          <Card className="border-zinc-200 shadow-sm overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                    Nr.
                  </TableHead>
                  <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                    Tímabil
                  </TableHead>
                  <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                    Vísitala
                  </TableHead>
                  <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                    Samtals
                  </TableHead>
                  <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                    Staða
                  </TableHead>
                  <TableHead className="w-[80px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                    Aðgerðir
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow
                    key={period.id}
                    className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                  >
                    <TableCell className="py-4 font-medium text-zinc-900">
                      Framvinda {period.period_number}
                    </TableCell>
                    <TableCell className="py-4 text-zinc-600">
                      {new Date(period.period_start).toLocaleDateString(
                        'is-IS'
                      )}{' '}
                      —{' '}
                      {new Date(period.period_end).toLocaleDateString(
                        'is-IS'
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-zinc-600 tabular-nums">
                      {period.visitala}
                    </TableCell>
                    <TableCell className="py-4 text-zinc-900 font-medium tabular-nums">
                      {period.total_with_visitala
                        ? formatISK(period.total_with_visitala)
                        : '—'}
                    </TableCell>
                    <TableCell className="py-4">
                      {period.status === 'finalized' ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700"
                        >
                          <Lock className="mr-1 h-3 w-3" />
                          Lokið
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700"
                        >
                          Drög
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8"
                      >
                        <Link
                          href={`/admin/framvinda/${projectId}/${period.id}`}
                        >
                          {period.status === 'draft' ? (
                            <Pencil className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="border-zinc-200 shadow-sm mt-4">
            <CardContent className="py-12 text-center text-zinc-500">
              Engin tímabil skráð. Búðu til fyrsta tímabilið hér að ofan.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
