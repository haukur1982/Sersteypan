import {
  getContract,
  getContractLines,
  getPeriods,
  getProjectForFramvinda,
  getCumulativeForAllPeriods,
  getRevisions,
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
import { Settings, FileText, Lock, Pencil } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FramvindaNewPeriodForm } from '@/components/framvinda/NewPeriodForm'
import { ProgressSummary } from '@/components/framvinda/ProgressSummary'

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
  const approvedRevisionIds = new Set(revisions.filter(r => r.status === 'approved').map(r => r.id))
  const activeLines = lines.filter(l => l.revision_id === null || (l.revision_id && approvedRevisionIds.has(l.revision_id)))

  // Calculate contract totals by category for active lines
  const categoryTotals = new Map<string, number>()
  let contractGrandTotal = 0
  for (const line of activeLines) {
    const current = categoryTotals.get(line.category) ?? 0
    categoryTotals.set(line.category, current + line.total_price)
    contractGrandTotal += line.total_price
  }

  const companyName =
    (project.companies as { name: string; kennitala: string } | null)?.name ?? ''

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
            <p className="text-xs text-zinc-400 mt-1">
              Grunnvísitala: {contract.grunnvisitala}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revisions (Viðbætur) */}
      <div className="flex justify-between items-center mt-8 mb-4">
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
        <Card className="border-zinc-200 shadow-sm overflow-hidden mb-8">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">Heiti</TableHead>
                <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">Staða</TableHead>
                <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">Aðgerðir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((rev) => (
                <TableRow key={rev.id} className="hover:bg-zinc-50">
                  <TableCell className="py-3 font-medium">{rev.name}</TableCell>
                  <TableCell className="py-3">
                    {rev.status === 'approved' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Samþykkt</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">Í vinnslu</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/framvinda/${projectId}/revisions/${rev.id}`}>
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
        <Card className="border-zinc-200 shadow-sm mb-8">
          <CardContent className="py-8 text-center text-zinc-500 text-sm">
            {!contract.is_frozen
              ? 'Samningur þarf að vera frystur (fyrsta uppgjör samþykkt) áður en viðbætur eru stofnaðar.'
              : 'Engar viðbætur (Change Orders) skráðar.'}
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      <h2 className="text-lg font-semibold text-zinc-900 mt-8 mb-4">Framvinda</h2>
      <ProgressSummary contractLines={activeLines} cumulative={cumulativeRecord} />

      {/* Periods */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-zinc-900">Tímabil</h2>
      </div>

      {/* New Period Form */}
      <FramvindaNewPeriodForm
        contractId={contract.id}
        projectId={projectId}
        nextPeriodNumber={(periods[periods.length - 1]?.period_number ?? 0) + 1}
        defaultVisitala={
          periods[periods.length - 1]?.visitala ?? contract.grunnvisitala
        }
        defaultGrunnvisitala={
          periods[periods.length - 1]?.grunnvisitala ?? contract.grunnvisitala
        }
      />

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
                    <div className="flex justify-end gap-1">
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="py-12 text-center text-zinc-500">
            Engin tímabil skráð. Búðu til fyrsta tímabilið hér að ofan.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
