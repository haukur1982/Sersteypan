import {
  getContract,
  getContractLines,
  getPeriods,
  getProjectForFramvinda,
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

  const [lines, periods] = await Promise.all([
    getContractLines(contract.id),
    getPeriods(contract.id),
  ])

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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/framvinda/${projectId}/setup`}>
            <Settings className="mr-1 h-3.5 w-3.5" />
            Breyta samningi
          </Link>
        </Button>
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
