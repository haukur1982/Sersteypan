'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { WeeklyCount, ElementTypeCount } from '@/lib/admin/reportQueries'

interface ProductionChartsProps {
  throughput: WeeklyCount[]
  elementTypes: ElementTypeCount[]
}

export function ProductionCharts({ throughput, elementTypes }: ProductionChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Throughput bar chart */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Framleiðni á viku (Throughput/Week)</CardTitle>
        </CardHeader>
        <CardContent>
          {throughput.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughput} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                    formatter={(value) => [`${value} stk`, 'Tilbúnar einingar']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-zinc-400">
              Engin framleiðslugögn á þessu tímabili
            </div>
          )}
        </CardContent>
      </Card>

      {/* Element type pie chart */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tegundasundurliðun (Element Types)</CardTitle>
        </CardHeader>
        <CardContent>
          {elementTypes.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-[180px] h-[180px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={elementTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="label"
                    >
                      {elementTypes.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} stk`]}
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
                {elementTypes.map((entry) => (
                  <div key={entry.type} className="flex items-center justify-between text-sm">
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
            <div className="flex items-center justify-center h-[180px] text-sm text-zinc-400">
              Engar einingar á þessu tímabili
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
