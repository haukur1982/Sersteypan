'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { AlertTriangle, ShieldCheck, Ban } from 'lucide-react'
import type { QualityStats } from '@/lib/admin/reportQueries'

interface QualityChartsProps {
  stats: QualityStats
}

export function QualityCharts({ stats }: QualityChartsProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {stats.defectRate}%
                </p>
                <p className="text-xs text-zinc-500">Gallahlutfall (Defect Rate)</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.totalDefects} gallar skráðir
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Ban className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {stats.deliveryImpactPercent}%
                </p>
                <p className="text-xs text-zinc-500">Afhendingaráhrif</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.deliveryImpactCount} gallar hafa áhrif á afhendingu
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <ShieldCheck className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {stats.rejectionRate}%
                </p>
                <p className="text-xs text-zinc-500">Höfnunarhlutfall</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.verificationRejected} af {stats.verificationTotal} skoðunum
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect trend */}
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gallar á viku (Defects/Week)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.weeklyTrend.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.weeklyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} gallar`, 'Fjöldi']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e4e4e7',
                        fontSize: '13px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      fill="#fecaca"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-zinc-400">
                Engir gallar skráðir á þessu tímabili
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gallaflokkun (Defect Categories)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryBreakdown.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-[160px] h-[160px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="label"
                      >
                        {stats.categoryBreakdown.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} gallar`]}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e4e4e7',
                          fontSize: '13px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {stats.categoryBreakdown.map((entry) => (
                    <div key={entry.category} className="flex items-center justify-between text-sm">
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
            ) : (
              <div className="flex items-center justify-center h-[160px] text-sm text-zinc-400">
                Engir gallar á þessu tímabili
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
