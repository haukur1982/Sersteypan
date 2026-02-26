import { Card } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  Timer,
  Droplets,
} from 'lucide-react'
import type { VelocityStats } from '@/lib/admin/reportQueries'

interface ProductionVelocityCardProps {
  stats: VelocityStats
}

export function ProductionVelocityCard({ stats }: ProductionVelocityCardProps) {
  const diff = stats.completedThisWeek - stats.completedLastWeek
  const trendUp = diff > 0
  const trendDown = diff < 0

  return (
    <Card className="p-4 md:p-6 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Framleiðsluhraði
        </h2>
        <span className="text-xs text-muted-foreground">Síðustu 30 dagar</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Completed this week */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-green-100">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-foreground">{stats.completedThisWeek}</span>
          </div>
          <p className="text-xs text-muted-foreground">Lokið í vikunni</p>
          {(stats.completedLastWeek > 0 || diff !== 0) && (
            <div className="flex items-center gap-1 text-xs">
              {trendUp && <TrendingUp className="w-3 h-3 text-green-600" />}
              {trendDown && <TrendingDown className="w-3 h-3 text-red-500" />}
              {!trendUp && !trendDown && <Minus className="w-3 h-3 text-zinc-400" />}
              <span className={trendUp ? 'text-green-600' : trendDown ? 'text-red-500' : 'text-zinc-400'}>
                {trendUp ? '+' : ''}{diff} vs síðustu viku
              </span>
            </div>
          )}
        </div>

        {/* Avg cycle time */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-blue-100">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              {stats.avgCycleTimeDays > 0 ? stats.avgCycleTimeDays : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Meðal framl.tími (dagar)</p>
          <p className="text-[10px] text-muted-foreground/70">Skipulögð → tilbúið</p>
        </div>

        {/* Avg curing time */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-amber-100">
              <Droplets className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              {stats.avgCuringHours > 0 ? stats.avgCuringHours : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Meðal þurrktími (klst)</p>
          <p className="text-[10px] text-muted-foreground/70">Steypa → tilbúið</p>
        </div>

        {/* Currently curing */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className={`p-1.5 rounded-md ${stats.curingCount > 0 ? 'bg-amber-100' : 'bg-zinc-100'}`}>
              <Timer className={`w-4 h-4 ${stats.curingCount > 0 ? 'text-amber-600' : 'text-zinc-500'}`} />
            </div>
            <span className={`text-2xl font-bold ${stats.curingCount > 0 ? 'text-amber-700' : 'text-foreground'}`}>
              {stats.curingCount}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Í þurrkun núna</p>
        </div>
      </div>
    </Card>
  )
}
