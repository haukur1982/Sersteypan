'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Scale, Package, TrendingUp } from 'lucide-react'
import type { ProjectProgressRow, OverviewStats } from '@/lib/admin/reportQueries'

interface ProjectProgressTableProps {
  projects: ProjectProgressRow[]
  overview: OverviewStats
}

export function ProjectProgressTable({ projects, overview }: ProjectProgressTableProps) {
  return (
    <div className="space-y-6">
      {/* Overview stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100">
                <Scale className="w-5 h-5 text-zinc-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {overview.totalWeightKg > 1000
                    ? `${(overview.totalWeightKg / 1000).toFixed(1)} t`
                    : `${overview.totalWeightKg} kg`}
                </p>
                <p className="text-xs text-zinc-500">Heildarþyngd (Total Weight)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {overview.totalElements}
                </p>
                <p className="text-xs text-zinc-500">Heildarfjöldi eininga</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {overview.avgWeightKg > 0
                    ? `${overview.avgWeightKg} kg`
                    : '—'}
                </p>
                <p className="text-xs text-zinc-500">Meðalþyngd eininga</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown mini chart */}
      {overview.statusBreakdown.length > 0 && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staðasundurliðun (Status Breakdown)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-[160px] h-[160px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overview.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="label"
                    >
                      {overview.statusBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {overview.statusBreakdown.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-zinc-600">{entry.label}</span>
                    </div>
                    <span className="font-medium text-zinc-900 tabular-nums">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project progress table */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verkefnaframvinda (Project Progress)</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Verkefni</TableHead>
                  <TableHead className="text-xs">Fyrirtæki</TableHead>
                  <TableHead className="text-xs text-right">Einingar</TableHead>
                  <TableHead className="text-xs text-right">Afhent</TableHead>
                  <TableHead className="text-xs w-[200px]">Framvinda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{p.companyName}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{p.total}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{p.deliveredCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-green-500"
                            style={{ width: `${p.completionPercent}%` }}
                          />
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 tabular-nums ${
                            p.completionPercent === 100
                              ? 'bg-green-100 text-green-800'
                              : p.completionPercent > 50
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {p.completionPercent}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-sm text-zinc-400">
              Engin verkefni með einingar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
