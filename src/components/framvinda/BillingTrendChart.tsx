'use client'

import {
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import { formatISK, formatISKShort } from '@/lib/framvinda/calculations'

interface TrendData {
  period: string
  periodAmount: number
  cumulativeAmount: number
}

interface BillingTrendChartProps {
  data: TrendData[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TrendData }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-zinc-900 mb-2">{d.period}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-green-600">Þetta tímabil:</span>
          <span className="tabular-nums font-medium">{formatISK(d.periodAmount)}</span>
        </div>
        <div className="flex justify-between gap-6 pt-1 border-t border-zinc-100">
          <span className="text-blue-600">Uppsafnað:</span>
          <span className="tabular-nums font-bold text-blue-700">{formatISK(d.cumulativeAmount)}</span>
        </div>
      </div>
    </div>
  )
}

export function BillingTrendChart({ data }: BillingTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-zinc-400">
        Engin lokin tímabil enn
      </div>
    )
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatISKShort(v)}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#d4d4d8', strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="cumulativeAmount"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#cumulativeGradient)"
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            name="Uppsafnað"
          />
          <Bar
            dataKey="periodAmount"
            fill="#22c55e"
            radius={[3, 3, 0, 0]}
            barSize={24}
            opacity={0.7}
            name="Þetta tímabil"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
