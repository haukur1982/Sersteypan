import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, CheckCircle, ArrowRight } from 'lucide-react'
import { DEFAULT_CURING_HOURS } from '@/lib/factory/queries'

interface CuringElement {
  id: string
  name: string
  element_type: string
  weight_kg: number | null
  elapsedHours: number
  progressPercent: number
  project: { id: string; name: string } | null
}

const typeLabels: Record<string, string> = {
  wall: 'Veggur',
  filigran: 'Filigran',
  staircase: 'Stigi',
  balcony: 'Svalir',
  svalagangur: 'Svalag.',
  ceiling: 'Þak',
  column: 'Súla',
  beam: 'Bita',
  other: 'Annað',
}

function formatElapsed(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} mín`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h} klst`
  return `${h} klst ${m} mín`
}

function getProgressColor(percent: number): {
  bar: string
  text: string
  bg: string
  border: string
  label: string
} {
  if (percent < 75) {
    return {
      bar: 'bg-blue-500',
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'Í þurrkun',
    }
  }
  if (percent < 100) {
    return {
      bar: 'bg-green-500',
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'Næstum tilbúið',
    }
  }
  if (percent < 150) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: 'Líklega tilbúið',
    }
  }
  return {
    bar: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Athuga!',
  }
}

interface CuringQueueCardProps {
  elements: CuringElement[]
}

export function CuringQueueCard({ elements }: CuringQueueCardProps) {
  if (elements.length === 0) {
    return (
      <Card className="p-6 border-green-200 bg-green-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">Engar einingar í þurrkun</p>
            <p className="text-xs text-green-600">Allt tilbúið eða bíður steypunar</p>
          </div>
        </div>
      </Card>
    )
  }

  const displayElements = elements.slice(0, 10)
  const overflow = elements.length - displayElements.length

  // Count elements likely ready (>= 100% of target time)
  const likelyReady = elements.filter((e) => e.progressPercent >= 100).length

  return (
    <Card className="p-4 md:p-6 border-amber-200 bg-amber-50/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-5 h-5 text-amber-600" />
          Í þurrkun
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {elements.length}
          </Badge>
        </h2>
        <div className="flex items-center gap-2">
          {likelyReady > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              {likelyReady} tilbúin
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Mörk: {DEFAULT_CURING_HOURS} klst
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {displayElements.map((el) => {
          const colors = getProgressColor(el.progressPercent)
          const clampedPercent = Math.min(el.progressPercent, 100)

          return (
            <Link
              key={el.id}
              href={`/factory/production/${el.id}`}
              className={`block p-3 rounded-lg border ${colors.border} ${colors.bg} hover:shadow-sm transition-all`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium text-foreground truncate">{el.name}</span>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {typeLabels[el.element_type] || el.element_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${colors.text}`}>
                    {formatElapsed(el.elapsedHours)}
                  </span>
                  <Badge variant="secondary" className={`text-[10px] ${colors.bg} ${colors.text} border-0`}>
                    {colors.label}
                  </Badge>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/80 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full transition-all`}
                  style={{ width: `${clampedPercent}%` }}
                />
              </div>

              {/* Bottom row: project + weight */}
              <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                <span className="truncate">{el.project?.name || '—'}</span>
                {el.weight_kg != null && (
                  <span className="tabular-nums flex-shrink-0">
                    {el.weight_kg.toLocaleString('is-IS')} kg
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {overflow > 0 && (
        <Link
          href="/factory/production?status=curing"
          className="flex items-center justify-center gap-1 mt-3 text-sm text-amber-700 hover:text-amber-900 hover:underline"
        >
          +{overflow} fleiri einingar
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </Card>
  )
}
