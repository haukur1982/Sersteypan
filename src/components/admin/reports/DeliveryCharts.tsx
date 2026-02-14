'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CheckCircle, Clock, Truck } from 'lucide-react'
import type { DeliveryStats } from '@/lib/admin/reportQueries'

interface DeliveryChartsProps {
  stats: DeliveryStats
}

export function DeliveryCharts({ stats }: DeliveryChartsProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {stats.onTimePercent}%
                </p>
                <p className="text-xs text-zinc-500">Stundvísi (On-time)</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.onTimeCount} af {stats.completedDeliveries} loknum
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {stats.avgDurationHours} klst.
                </p>
                <p className="text-xs text-zinc-500">Meðalafhendingartími</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              frá brottför til staðfestingar
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Truck className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {stats.totalDeliveries}
                </p>
                <p className="text-xs text-zinc-500">Afhendingar samtals</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.completedDeliveries} loknar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Afhendingar á viku (Deliveries/Week)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.weeklyTrend.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                    formatter={(value) => [`${value} afhendingar`, 'Fjöldi']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '13px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-zinc-400">
              Engar afhendingar á þessu tímabili
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
