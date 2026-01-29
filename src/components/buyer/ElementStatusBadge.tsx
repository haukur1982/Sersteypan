import {
  Clock,
  Wrench,
  Layers,
  Timer,
  CheckCircle,
  Truck,
  CheckCheck,
  AlertTriangle
} from 'lucide-react'

type ElementStatus = 'planned' | 'rebar' | 'cast' | 'curing' | 'ready' | 'loaded' | 'delivered' | 'issue'

interface StatusConfig {
  color: string
  icon: typeof Clock
  label: string
  ariaLabel: string
}

const statusConfig: Record<ElementStatus, StatusConfig> = {
  planned: {
    color: 'bg-zinc-100 text-zinc-800',
    icon: Clock,
    label: 'Skipulagt',
    ariaLabel: 'Status: Skipulagt - ekki hafið'
  },
  rebar: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Wrench,
    label: 'Járnabundið',
    ariaLabel: 'Status: Járnabundið - í vinnslu'
  },
  cast: {
    color: 'bg-orange-100 text-orange-800',
    icon: Layers,
    label: 'Steypt',
    ariaLabel: 'Status: Steypt - bíður þurrkunar'
  },
  curing: {
    color: 'bg-amber-100 text-amber-800',
    icon: Timer,
    label: 'Þornar',
    ariaLabel: 'Status: Þornar'
  },
  ready: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Tilbúið',
    ariaLabel: 'Status: Tilbúið til afhendingar'
  },
  loaded: {
    color: 'bg-blue-100 text-blue-800',
    icon: Truck,
    label: 'Á bíl',
    ariaLabel: 'Status: Hlaðið á bíl'
  },
  delivered: {
    color: 'bg-purple-100 text-purple-800',
    icon: CheckCheck,
    label: 'Afhent',
    ariaLabel: 'Status: Afhent á staðinn'
  },
  issue: {
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
    label: 'Vandamál',
    ariaLabel: 'Status: Vandamál - þarfnast athygli'
  }
}

interface ElementStatusBadgeProps {
  status: ElementStatus | string | null | undefined
  className?: string
}

/**
 * Status badge for elements
 * Includes color, icon, and text for accessibility (WCAG compliant)
 *
 * Handles null/undefined status by defaulting to 'planned'
 */
export function ElementStatusBadge({ status, className = '' }: ElementStatusBadgeProps) {
  // Default to 'planned' if status is null/undefined/unknown
  const safeStatus: ElementStatus = (typeof status === 'string' && status in statusConfig)
    ? status as ElementStatus
    : 'planned'

  const config = statusConfig[safeStatus]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${config.color} ${className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  )
}
