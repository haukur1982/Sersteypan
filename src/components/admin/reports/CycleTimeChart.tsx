'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle } from 'lucide-react'
import type { CycleTimeStage } from '@/lib/admin/reportQueries'

const stageColors: Record<string, string> = {
  planned_to_rebar: '#eab308',
  rebar_to_cast: '#f97316',
  cast_to_curing: '#f59e0b',
  curing_to_ready: '#22c55e',
}

interface CycleTimeChartProps {
  cycleTime: CycleTimeStage[]
  bottleneck: CycleTimeStage | null
}

export function CycleTimeChart({ cycleTime, bottleneck }: CycleTimeChartProps) {
  const hasData = cycleTime.some(s => s.sampleSize > 0)

  // Format hours to days + hours
  function formatDuration(hours: number): string {
    if (hours < 24) return `${hours} klst.`
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    if (remainingHours === 0) return `${days} ${days === 1 ? 'dagur' : 'dagar'}`
    return `${days}d ${remainingHours}klst.`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cycle time chart */}
      <Card className="border-zinc-200 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Meðalvinnslutími eftir þrepi (Avg Cycle Time by Stage)</CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cycleTime}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fontSize: 12, fill: '#3f3f46' }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => [formatDuration(Number(value)), 'Meðaltími']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '13px',
                    }}
                  />
                  <Bar
                    dataKey="avgHours"
                    radius={[0, 4, 4, 0]}
                    fill="#3b82f6"
                  >
                    {cycleTime.map((entry) => (
                      <rect
                        key={entry.stageKey}
                        fill={stageColors[entry.stageKey] || '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-sm text-zinc-400">
              Engin gögn — engar einingar hafa lokið framleiðsluferli á þessu tímabili
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottleneck indicator */}
      <Card className={bottleneck ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200'}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Flöskuháls (Bottleneck)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bottleneck ? (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0 mb-2">
                  {bottleneck.stage}
                </Badge>
                <p className="text-3xl font-bold text-amber-900 tabular-nums">
                  {formatDuration(bottleneck.avgHours)}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  meðaltími — {bottleneck.sampleSize} einingar mældar
                </p>
              </div>
              <div className="space-y-2">
                {cycleTime.filter(s => s.sampleSize > 0).map(s => (
                  <div key={s.stageKey} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{s.stage}</span>
                    <span className={`font-medium tabular-nums ${s.stageKey === bottleneck.stageKey ? 'text-amber-700 font-bold' : 'text-zinc-900'}`}>
                      {formatDuration(s.avgHours)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-sm text-zinc-400">
              Engin gögn til greiningar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
