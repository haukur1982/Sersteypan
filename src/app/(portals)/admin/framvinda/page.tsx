import { getProjectsWithFramvindaStatus } from '@/lib/framvinda/queries'
import { Card } from '@/components/ui/card'
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
import { TrendingUp, Settings, Eye } from 'lucide-react'
import Link from 'next/link'

export default async function FramvindaPage() {
  const projects = await getProjectsWithFramvindaStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Framvinda
        </h1>
        <p className="text-zinc-600 mt-2">
          Framvindureikningar fyrir verk. Veldu verk til að setja upp samning eða búa til nýja framvindu.
        </p>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                Verk
              </TableHead>
              <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                Fyrirtæki
              </TableHead>
              <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                Staða
              </TableHead>
              <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                Tímabil
              </TableHead>
              <TableHead className="w-[140px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                Aðgerðir
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => {
              const hasContract = !!project.contract_id

              return (
                <TableRow
                  key={project.id}
                  className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                >
                  <TableCell className="font-medium py-4 text-zinc-900">
                    {hasContract ? (
                      <Link
                        href={`/admin/framvinda/${project.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {project.name}
                      </Link>
                    ) : (
                      project.name
                    )}
                    {project.address && (
                      <span className="block text-sm text-zinc-500">
                        {project.address}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {project.company_name ?? '—'}
                  </TableCell>
                  <TableCell className="py-4">
                    {hasContract ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700"
                      >
                        Samningur skráður
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-zinc-100 text-zinc-500"
                      >
                        Uppsetning vantar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {project.period_count > 0 ? (
                      <span>
                        {project.period_count} tímabil
                        {project.latest_period_status === 'draft' && (
                          <Badge
                            variant="secondary"
                            className="ml-2 bg-amber-100 text-amber-700"
                          >
                            Drög
                          </Badge>
                        )}
                      </span>
                    ) : hasContract ? (
                      <span className="text-zinc-400">Ekkert tímabil</span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex justify-end gap-1">
                      {hasContract ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                          >
                            <Link href={`/admin/framvinda/${project.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                          >
                            <Link
                              href={`/admin/framvinda/${project.id}/setup`}
                            >
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <Button
                          asChild
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Link
                            href={`/admin/framvinda/${project.id}/setup`}
                          >
                            <TrendingUp className="mr-1 h-3.5 w-3.5" />
                            Setja upp
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {projects.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-zinc-500"
                >
                  Engin verk fundust
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
