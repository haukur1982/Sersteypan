'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatISK, formatISKShort } from '@/lib/framvinda/calculations'
import { FileText, TrendingUp, Activity, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardsProps {
  contractTotal: number
  billedAmount: number
  remainingAmount: number
  percentComplete: number
}

function ProgressRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(percent, 1) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e4e4e7"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={percent >= 1 ? '#22c55e' : percent >= 0.5 ? '#3b82f6' : '#f59e0b'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  children,
}: {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  children?: React.ReactNode
}) {
  return (
    <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
              {title}
            </p>
            <p className="text-xl lg:text-2xl font-bold tabular-nums text-zinc-900 leading-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex-shrink-0 ml-3">
            {children || (
              <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function KpiCards({
  contractTotal,
  billedAmount,
  remainingAmount,
  percentComplete,
}: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Samningur"
        value={formatISKShort(contractTotal)}
        subtitle={formatISK(contractTotal)}
        icon={FileText}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <KpiCard
        title="Rukkað"
        value={formatISKShort(billedAmount)}
        subtitle={formatISK(billedAmount)}
        icon={TrendingUp}
        iconBg="bg-green-50"
        iconColor="text-green-600"
      />
      <KpiCard
        title="Framvinda"
        value={Math.round(percentComplete * 100) + '%'}
        subtitle="Heildarframvinda"
        icon={Activity}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      >
        <ProgressRing percent={percentComplete} />
      </KpiCard>
      <KpiCard
        title="Eftirstöðvar"
        value={formatISKShort(remainingAmount)}
        subtitle={formatISK(remainingAmount)}
        icon={Clock}
        iconBg="bg-zinc-100"
        iconColor="text-zinc-600"
      />
    </div>
  )
}
