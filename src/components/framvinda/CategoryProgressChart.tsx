'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatISK } from '@/lib/framvinda/calculations'

interface CategoryData {
  category: string
  contractTotal: number
  billedAmount: number
  remaining: number
  percent: number
}

interface CategoryProgressChartProps {
  data: CategoryData[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryData }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-zinc-900 mb-2">{d.category}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-zinc-500">Samningur:</span>
          <span className="tabular-nums font-medium">{formatISK(d.contractTotal)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-green-600">Rukkað:</span>
          <span className="tabular-nums font-medium text-green-700">{formatISK(d.billedAmount)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-zinc-500">Eftir:</span>
          <span className="tabular-nums font-medium">{formatISK(d.remaining)}</span>
        </div>
        <div className="pt-1 border-t border-zinc-100 flex justify-between gap-6">
          <span className="text-zinc-500">Framvinda:</span>
          <span className="tabular-nums font-bold">{d.percent}%</span>
        </div>
      </div>
    </div>
  )
}

export function CategoryProgressChart({ data }: CategoryProgressChartProps) {
  // Prepare stacked data
  const chartData = data.map((d) => ({
    ...d,
    remaining: Math.max(0, d.contractTotal - d.billedAmount),
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-zinc-400">
        Engin gögn til staðar
      </div>
    )
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e4e4e7"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
              if (v >= 1_000) return `${Math.round(v / 1_000)}þ`
              return String(v)
            }}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 12, fill: '#18181b', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />
          <Bar
            dataKey="billedAmount"
            stackId="a"
            radius={[0, 0, 0, 0]}
            name="Rukkað"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.percent >= 100 ? '#16a34a' : '#22c55e'}
              />
            ))}
          </Bar>
          <Bar
            dataKey="remaining"
            stackId="a"
            fill="#e4e4e7"
            radius={[0, 4, 4, 0]}
            name="Eftir"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
