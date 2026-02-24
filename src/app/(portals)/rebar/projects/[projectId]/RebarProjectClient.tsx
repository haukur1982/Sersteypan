'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Construction,
  CheckCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { startRebarWork } from '@/lib/rebar/actions'

interface Element {
  id: string
  name: string
  element_type: string
  status: string | null
  floor: number | null
  weight_kg: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  rebar_spec: string | null
  rebar_completed_at: string | null
  position_description: string | null
  drawing_reference: string | null
  checklist: unknown
  qr_code_url: string | null
  created_at: string | null
  updated_at: string | null
}

interface RebarProjectClientProps {
  project: {
    id: string
    name: string
    address: string | null
  }
  elements: Element[]
}

export function RebarProjectClient({ project, elements: initialElements }: RebarProjectClientProps) {
  const [elements, setElements] = useState(initialElements)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Split into two groups
  const needsRebar = elements.filter((e) => e.status === 'planned')
  const inProgress = elements.filter((e) => e.status === 'rebar')

  const handleStartRebar = (element: Element) => {
    setPendingId(element.id)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = await startRebarWork(element.id)
      setPendingId(null)

      if (result.success) {
        setSuccessMessage(`${element.name} → Járnabinding hafin`)
        // Move element from planned to rebar in local state
        setElements((prev) =>
          prev.map((e) =>
            e.id === element.id ? { ...e, status: 'rebar' } : e
          )
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/rebar" className="shrink-0">
          <Button variant="outline" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 truncate">
            {project.name}
          </h1>
          {project.address && (
            <p className="text-sm text-zinc-500 truncate">{project.address}</p>
          )}
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <p className="font-semibold text-green-900">{successMessage}</p>
          </div>
        </Card>
      )}

      {/* Needs rebar section */}
      {needsRebar.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
            <Construction className="w-5 h-5" />
            Þarfnast járnabindingar ({needsRebar.length})
          </h2>

          <div className="space-y-2">
            {needsRebar.map((element) => (
              <Card
                key={element.id}
                className="p-4 border-l-4 border-l-amber-400"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-zinc-900 truncate">
                      {element.name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                      <span>{element.element_type}</span>
                      {element.weight_kg != null && (
                        <span className="font-medium text-zinc-700">
                          {element.weight_kg.toLocaleString('is-IS')} kg
                        </span>
                      )}
                      {element.rebar_spec && (
                        <span className="text-amber-700">{element.rebar_spec}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartRebar(element)}
                    disabled={isPending && pendingId === element.id}
                    className="h-12 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
                  >
                    {isPending && pendingId === element.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Hefja'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In progress section */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
            <Construction className="w-5 h-5" />
            Í vinnslu ({inProgress.length})
          </h2>

          <div className="space-y-2">
            {inProgress.map((element) => (
              <Link
                key={element.id}
                href={`/rebar/element/${element.id}`}
              >
                <Card className="p-4 border-l-4 border-l-blue-400 active:bg-zinc-50 transition-colors mb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-zinc-900 truncate">
                        {element.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                        <span>{element.element_type}</span>
                        {element.weight_kg != null && (
                          <span className="font-medium text-zinc-700">
                            {element.weight_kg.toLocaleString('is-IS')} kg
                          </span>
                        )}
                        {element.rebar_spec && (
                          <span className="text-blue-700">{element.rebar_spec}</span>
                        )}
                        {element.rebar_completed_at && (
                          <span className="text-green-700 font-medium">
                            ✓ Lokið
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-zinc-400 shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {needsRebar.length === 0 && inProgress.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-zinc-500 font-medium text-lg">
            Engar einingar þarfnast járnabindingar í þessu verkefni
          </p>
        </Card>
      )}
    </div>
  )
}
