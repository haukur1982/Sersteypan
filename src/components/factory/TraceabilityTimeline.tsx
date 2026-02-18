'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Wrench,
  Layers,
  ClipboardCheck,
  Truck,
  Timer,
  CheckCircle,
  Camera,
  AlertTriangle,
  Clock,
  Package,
} from 'lucide-react'

type StepStatus = 'completed' | 'current' | 'future'

interface TimelineStep {
  id: string
  icon: typeof Clock
  iconColor: string
  bgColor: string
  futureBgColor: string
  label: string
  timestamp: string | null
  description?: string
  link?: string
  linkLabel?: string
  status: StepStatus
}

interface TraceabilityTimelineProps {
  element: {
    id: string
    name: string
    drawing_reference?: string | null
    rebar_spec?: string | null
    batch_number?: string | null
    rebar_completed_at?: string | null
    cast_at?: string | null
    curing_completed_at?: string | null
    ready_at?: string | null
    loaded_at?: string | null
    delivered_at?: string | null
    created_at?: string | null
  }
  batch?: {
    id: string
    batch_number: string
    batch_date: string
    concrete_grade?: string | null
    concrete_slip_url?: string | null
    checklist?: Array<{ checked: boolean }>
  } | null
  fixRequests?: Array<{
    id: string
    status: string
    issue_description: string
    created_at: string | null
  }>
  photoCount?: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleString('is-IS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function TraceabilityTimeline({
  element,
  batch,
  fixRequests = [],
  photoCount = 0,
}: TraceabilityTimelineProps) {
  // Determine step completion status
  const checklistItems = batch?.checklist || []
  const allChecked = checklistItems.length > 0 && checklistItems.every((i) => i.checked)

  // Build all 9 steps — always rendered
  const steps: TimelineStep[] = [
    {
      id: 'created',
      icon: FileText,
      iconColor: 'text-zinc-600',
      bgColor: 'bg-zinc-100',
      futureBgColor: 'bg-zinc-50 border border-dashed border-zinc-300',
      label: 'Eining stofnuð',
      timestamp: element.created_at || null,
      description: element.drawing_reference
        ? `Teikning: ${element.drawing_reference}`
        : undefined,
      status: element.created_at ? 'completed' : 'future',
    },
    {
      id: 'rebar',
      icon: Wrench,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      futureBgColor: 'bg-yellow-50/50 border border-dashed border-yellow-200',
      label: 'Járnabinding lokið',
      timestamp: element.rebar_completed_at || null,
      description: element.rebar_spec
        ? `Járnauppsetning: ${element.rebar_spec}`
        : undefined,
      status: element.rebar_completed_at ? 'completed' : 'future',
    },
    {
      id: 'batch',
      icon: Layers,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      futureBgColor: 'bg-blue-50/50 border border-dashed border-blue-200',
      label: batch ? `Lota ${batch.batch_number}` : 'Lota úthlutað',
      timestamp: batch?.batch_date || null,
      description: batch?.concrete_grade
        ? `Steypustyrkur: ${batch.concrete_grade}`
        : undefined,
      link: batch ? `/factory/batches/${batch.id}` : undefined,
      linkLabel: 'Opna lotu',
      status: batch ? 'completed' : 'future',
    },
    {
      id: 'checklist',
      icon: ClipboardCheck,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      futureBgColor: 'bg-green-50/50 border border-dashed border-green-200',
      label: 'Gátlisti staðfestur',
      timestamp: allChecked ? (batch?.batch_date || null) : null,
      description: batch
        ? `${checklistItems.filter((i) => i.checked).length}/${checklistItems.length} atriði hakuð`
        : undefined,
      status: allChecked ? 'completed' : 'future',
    },
    {
      id: 'cast',
      icon: Layers,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      futureBgColor: 'bg-orange-50/50 border border-dashed border-orange-200',
      label: 'Steypt',
      timestamp: element.cast_at || null,
      description: batch?.concrete_slip_url ? 'Steypuskýrsla til staðar' : undefined,
      status: element.cast_at ? 'completed' : 'future',
    },
    {
      id: 'curing',
      icon: Timer,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-100',
      futureBgColor: 'bg-amber-50/50 border border-dashed border-amber-200',
      label: 'Þurrkun lokið',
      timestamp: element.curing_completed_at || null,
      status: element.curing_completed_at ? 'completed' : 'future',
    },
    {
      id: 'ready',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      futureBgColor: 'bg-green-50/50 border border-dashed border-green-200',
      label: 'Tilbúið til afhendingar',
      timestamp: element.ready_at || null,
      status: element.ready_at ? 'completed' : 'future',
    },
    {
      id: 'loaded',
      icon: Truck,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      futureBgColor: 'bg-blue-50/50 border border-dashed border-blue-200',
      label: 'Hlaðið á bíl',
      timestamp: element.loaded_at || null,
      status: element.loaded_at ? 'completed' : 'future',
    },
    {
      id: 'delivered',
      icon: Package,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
      futureBgColor: 'bg-purple-50/50 border border-dashed border-purple-200',
      label: 'Afhent',
      timestamp: element.delivered_at || null,
      status: element.delivered_at ? 'completed' : 'future',
    },
  ]

  // Mark the first non-completed step as "current"
  let foundCurrent = false
  for (const step of steps) {
    if (step.status === 'future' && !foundCurrent) {
      step.status = 'current'
      foundCurrent = true
    }
  }

  // Count completed steps for progress
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const totalCount = steps.length

  // Fix requests alerts
  const activeFixRequests = fixRequests.filter(
    (f) => f.status !== 'completed' && f.status !== 'cancelled'
  )

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-zinc-600" />
            Rekjanleiki
          </div>
          <Badge
            variant="outline"
            className={
              completedCount === totalCount
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-zinc-100 text-zinc-700'
            }
          >
            {completedCount}/{totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Fix request alerts */}
        {activeFixRequests.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeFixRequests.map((fix) => (
              <div
                key={fix.id}
                className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-800">Lagfæring virk</p>
                  <p className="text-xs text-red-700 truncate">{fix.issue_description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline — all 9 steps always visible */}
        <div className="relative">
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = step.status === 'completed'
              const isCurrent = step.status === 'current'
              const isFuture = step.status === 'future'
              const isLast = index === steps.length - 1

              // Determine line style between this and next step
              const nextStep = steps[index + 1]
              const lineCompleted = isCompleted && nextStep?.status === 'completed'

              return (
                <div key={step.id} className="relative flex gap-3 pl-1">
                  {/* Connector line to next step */}
                  {!isLast && (
                    <div
                      className={`absolute left-[14px] top-7 bottom-[-12px] w-0.5 ${
                        lineCompleted
                          ? 'bg-zinc-300'
                          : isCompleted && !lineCompleted
                          ? 'bg-zinc-200 border-dashed'
                          : 'border-l border-dashed border-zinc-300'
                      }`}
                      style={
                        !lineCompleted && !isCompleted
                          ? { borderLeftWidth: '2px', width: 0 }
                          : {}
                      }
                    />
                  )}

                  {/* Icon circle */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ${
                      isCompleted
                        ? step.bgColor
                        : isCurrent
                        ? `${step.bgColor} ring-2 ring-offset-1 ring-blue-400`
                        : step.futureBgColor
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        isCompleted
                          ? step.iconColor
                          : isCurrent
                          ? step.iconColor
                          : 'text-zinc-400'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'text-zinc-900'
                            : isCurrent
                            ? 'text-zinc-800'
                            : 'text-zinc-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCompleted && step.timestamp && (
                        <span className="text-xs text-zinc-500">
                          {formatDate(step.timestamp)}
                        </span>
                      )}
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600 bg-blue-50">
                          Næst
                        </Badge>
                      )}
                      {isFuture && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-200 text-zinc-400">
                          Á eftir
                        </Badge>
                      )}
                    </div>
                    {isCompleted && step.description && (
                      <p className="text-xs text-zinc-600 mt-0.5">{step.description}</p>
                    )}
                    {!isFuture && step.link && (
                      <Link
                        href={step.link}
                        className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
                      >
                        {step.linkLabel || 'Opna'}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Photo count */}
        {photoCount > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-500">
            <Camera className="h-3.5 w-3.5" />
            <span>{photoCount} myndir skráðar</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
