import {
  getContract,
  getContractLines,
  getPeriods,
  getProjectForFramvinda,
  getCumulativeForAllPeriods,
} from '@/lib/framvinda/queries'
import { formatISK } from '@/lib/framvinda/calculations'
import { CATEGORY_LABELS, type FramvindaCategory } from '@/lib/framvinda/types'
import { Card, CardContent } from '@/components/ui/card'
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
import { FileText, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProgressSummary } from '@/components/framvinda/ProgressSummary'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function BuyerFramvindaProjectPage({ params }: PageProps) {
  const { projectId } = await params
  const project = await getProjectForFramvinda(projectId)

  if (!project) redirect('/buyer/framvinda')

  const contract = await getContract(projectId)

  if (!contract) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {project.name}
        </h1>
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="py-12 text-center text-zinc-500">
            Enginn framvindusamningur skráður.
          </CardContent>
        </Card>
      </div>
    )
  }

  const [lines, periods, cumulativeMap] = await Promise.all([
    getContractLines(contract.id),
    getPeriods(contract.id),
    getCumulativeForAllPeriods(contract.id),
  ])

  // Convert Map to Record for client component
  const cumulativeRecord: Record<string, number> = {}
  for (const [key, value] of cumulativeMap) {
    cumulativeRecord[key] = value
  }

  // Calculate contract totals by category
  const categoryTotals = new Map<string, number>()
  let contractGrandTotal = 0
  for (const line of lines) {
    const current = categoryTotals.get(line.category) ?? 0
    categoryTotals.set(line.category, current + line.total_price)
    contractGrandTotal += line.total_price
  }

  const companyName =
    (project.companies as { name: string; kennitala: string } | null)?.name ?? ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/buyer/framvinda"
            className="text-zinc-400 hover:text-zinc-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Framvinda — {project.name}
          </h1>
        </div>
        <p className="text-zinc-600 mt-1">
          {companyName}
          {project.address ? ` · ${project.address}` : ''}
        </p>
      </div>

      {/* Contract Summary */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            Samningur
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from(categoryTotals.entries()).map(
              ([category, total]) => (
                <div key={category} className="text-center">
                  <p className="text-sm text-zinc-500">
                    {CATEGORY_LABELS[category as FramvindaCategory] ?? category}
                  </p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {formatISK(total)}
                  </p>
                </div>
              )
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-500">Heildarsamningur</p>
            <p className="text-2xl font-bold text-zinc-900">
              {formatISK(contractGrandTotal)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <ProgressSummary contractLines={lines} cumulative={cumulativeRecord} />

      {/* Finalized Periods */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Lokaðar framvindur
        </h2>
      </div>

      {periods.length > 0 ? (
        <Card className="border-zinc-200 shadow-sm overflow-hidden">
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
                  Grunnvísitala
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
                <TableHead className="w-[100px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                  Skoða
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
                    {new Date(period.period_start).toLocaleDateString('is-IS')}{' '}
                    —{' '}
                    {new Date(period.period_end).toLocaleDateString('is-IS')}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {period.grunnvisitala}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {period.visitala}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-900 font-medium">
                    {period.total_with_visitala
                      ? formatISK(period.total_with_visitala)
                      : '—'}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700"
                    >
                      <Lock className="mr-1 h-3 w-3" />
                      Lokið
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8"
                    >
                      <Link
                        href={`/buyer/framvinda/${projectId}/${period.id}`}
                      >
                        <FileText className="h-4 w-4" />
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
          <CardContent className="py-12 text-center text-zinc-500">
            Engar lokaðar framvindur.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
