'use client'

import Link from 'next/link'
import { Package, Ruler, Weight, Calendar, ArrowRight, LogIn } from 'lucide-react'

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  planned: { label: 'Skipulagt', color: 'text-zinc-700', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  rebar: { label: 'Járnabundið', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  cast: { label: 'Steypt', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  curing: { label: 'Þornar', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  ready: { label: 'Tilbúið', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  loaded: { label: 'Á bíl', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  delivered: { label: 'Afhent', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
}

const TYPE_LABELS: Record<string, string> = {
  wall: 'Veggur',
  filigran: 'Filigran',
  balcony: 'Svalir',
  svalagangur: 'Svalagangar',
  staircase: 'Stigi',
  column: 'Súla',
  beam: 'Biti',
  ceiling: 'Þak',
  other: 'Annað',
}

const STATUSES_IN_ORDER = ['planned', 'rebar', 'cast', 'curing', 'ready', 'loaded', 'delivered'] as const

type ElementPublicData = {
  id: string
  name: string
  element_type: string
  status: string
  weight_kg: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  qr_code_url: string | null
  created_at: string | null
  rebar_completed_at: string | null
  cast_at: string | null
  curing_completed_at: string | null
  ready_at: string | null
  delivered_at: string | null
  project: { name: string } | null
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('is-IS', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

export function QrElementPublic({ element }: { element: ElementPublicData }) {
  const statusConfig = STATUS_CONFIG[element.status] ?? STATUS_CONFIG.planned
  const typeName = TYPE_LABELS[element.element_type] ?? element.element_type

  // Build timeline data
  const statusIndex = STATUSES_IN_ORDER.indexOf(element.status as typeof STATUSES_IN_ORDER[number])

  const timelineSteps = [
    { key: 'planned', label: 'Skipulagt', date: element.created_at },
    { key: 'rebar', label: 'Járnabundið', date: element.rebar_completed_at },
    { key: 'cast', label: 'Steypt', date: element.cast_at },
    { key: 'curing', label: 'Þornar', date: element.curing_completed_at },
    { key: 'ready', label: 'Tilbúið', date: element.ready_at },
    { key: 'delivered', label: 'Afhent', date: element.delivered_at },
  ]

  const hasDimensions =
    element.length_mm != null || element.width_mm != null || element.height_mm != null

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-zinc-900 truncate">
                {element.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                >
                  {statusConfig.label}
                </span>
                <span className="text-sm text-zinc-500">{typeName}</span>
              </div>
              {element.project && (
                <p className="text-sm text-zinc-500 mt-1">
                  {element.project.name}
                </p>
              )}
            </div>
            {/* QR image */}
            {element.qr_code_url && (
              <div className="flex-shrink-0 ml-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={element.qr_code_url}
                  alt="QR"
                  className="w-16 h-16 rounded"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Dimensions & Weight */}
        {(hasDimensions || element.weight_kg != null) && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="grid grid-cols-2 gap-4">
              {element.weight_kg != null && (
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-orange-50">
                    <Weight className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-zinc-900">
                      {element.weight_kg.toLocaleString('is-IS')} kg
                    </p>
                    <p className="text-xs text-zinc-500">Þyngd</p>
                  </div>
                </div>
              )}
              {hasDimensions && (
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Ruler className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {[element.length_mm, element.width_mm, element.height_mm]
                        .filter((v) => v != null)
                        .map((v) => `${v}`)
                        .join(' × ')}{' '}
                      mm
                    </p>
                    <p className="text-xs text-zinc-500">L × B × H</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type card */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100">
              <Package className="h-4 w-4 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{typeName}</p>
              <p className="text-xs text-zinc-500">Tegund einingar</p>
            </div>
          </div>
        </div>

        {/* Production Timeline */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-700">
              Framleiðsluferill
            </h2>
          </div>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
              const stepIndex = STATUSES_IN_ORDER.indexOf(step.key as typeof STATUSES_IN_ORDER[number])
              const isComplete = stepIndex <= statusIndex
              const isCurrent = step.key === element.status
              const dateStr = formatDate(step.date)

              return (
                <div key={step.key} className="flex items-start gap-3">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-600'
                          : isComplete
                            ? 'border-green-500 bg-green-500'
                            : 'border-zinc-300 bg-white'
                      }`}
                    />
                    {i < timelineSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${
                          isComplete ? 'bg-green-300' : 'bg-zinc-200'
                        }`}
                      />
                    )}
                  </div>
                  {/* Label + date */}
                  <div className="pb-2 -mt-0.5">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-blue-700'
                          : isComplete
                            ? 'text-zinc-900'
                            : 'text-zinc-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {dateStr && (
                      <p className="text-xs text-zinc-400">{dateStr}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Login CTA */}
        <Link
          href="/login"
          className="flex items-center justify-between w-full bg-white rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <LogIn className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Skr&aacute;&eth;u &thorn;ig inn
              </p>
              <p className="text-xs text-zinc-500">
                Sj&aacute;&eth;u n&aacute;nari uppl&yacute;singar um einingu
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
        </Link>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-400 pt-2">
          S&eacute;rsteypan ehf. &middot; Framlei&eth;slustj&oacute;rnunarkerfi
        </p>
      </div>
    </div>
  )
}
