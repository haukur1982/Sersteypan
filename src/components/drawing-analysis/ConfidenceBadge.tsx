import { Badge } from '@/components/ui/badge'
import type { ConfidenceLevel } from '@/lib/schemas/drawing-analysis'

export type DisplayConfidenceLevel = ConfidenceLevel | 'calculated'

const confidenceConfig: Record<DisplayConfidenceLevel, { color: string; label: string }> = {
  high: { color: 'bg-green-100 text-green-800', label: 'Hátt' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Miðlungs' },
  low: { color: 'bg-red-100 text-red-800', label: 'Lágt' },
  calculated: { color: 'bg-blue-100 text-blue-800', label: 'Reiknað' },
}

export function ConfidenceBadge({ level }: { level: DisplayConfidenceLevel }) {
  const config = confidenceConfig[level] || confidenceConfig.low

  return (
    <Badge variant="secondary" className={`${config.color} border-0 text-xs font-normal`}>
      {config.label}
    </Badge>
  )
}
