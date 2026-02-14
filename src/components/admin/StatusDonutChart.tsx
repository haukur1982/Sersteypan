'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface StatusData {
    name: string
    value: number
    color: string
}

interface StatusDonutChartProps {
    data: StatusData[]
    total: number
}

export function StatusDonutChart({ data, total }: StatusDonutChartProps) {
    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-sm text-zinc-400">
                Engar einingar
            </div>
        )
    }

    return (
        <div className="flex items-center gap-6">
            <div className="w-[180px] h-[180px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
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
                {data.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-zinc-600">{entry.name}</span>
                        </div>
                        <span className="font-medium text-zinc-900 tabular-nums">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
