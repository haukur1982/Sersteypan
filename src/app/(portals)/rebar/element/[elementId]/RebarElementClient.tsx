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
  FileText,
  Ruler,
  Weight,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { markRebarComplete, updateChecklistItem } from '@/lib/rebar/actions'

interface ChecklistItem {
  key: string
  label: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
}

interface Document {
  id: string
  name: string
  file_url: string | null
  category: string | null
  created_at: string | null
}

interface ElementData {
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
  production_notes: string | null
  project_id: string
  created_at: string | null
  updated_at: string | null
  project: {
    id: string
    name: string
    address: string | null
  } | null
}

interface RebarElementClientProps {
  element: ElementData
  documents: Document[]
}

// Rebar-relevant checklist keys — highlight these for the rebar worker
const REBAR_KEYS = ['rebar', 'dimensions', 'mold_oiled']

export function RebarElementClient({ element, documents }: RebarElementClientProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    (element.checklist as ChecklistItem[]) || []
  )
  const [isCompleted, setIsCompleted] = useState(!!element.rebar_completed_at)
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasDimensions =
    element.length_mm != null ||
    element.width_mm != null ||
    element.height_mm != null

  // Sort checklist: rebar-relevant items first
  const sortedChecklist = [...checklist].sort((a, b) => {
    const aIsRebar = REBAR_KEYS.includes(a.key) ? 0 : 1
    const bIsRebar = REBAR_KEYS.includes(b.key) ? 0 : 1
    return aIsRebar - bIsRebar
  })

  const handleChecklistToggle = (itemKey: string, currentChecked: boolean) => {
    const newChecked = !currentChecked
    setPendingAction(itemKey)
    setError(null)

    startTransition(async () => {
      const result = await updateChecklistItem(element.id, itemKey, newChecked)
      setPendingAction(null)

      if (result.success) {
        setChecklist((prev) =>
          prev.map((item) =>
            item.key === itemKey
              ? { ...item, checked: newChecked }
              : item
          )
        )
      } else {
        setError(result.error || 'Villa')
      }
    })
  }

  const handleMarkComplete = () => {
    setPendingAction('complete')
    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = await markRebarComplete(element.id)
      setPendingAction(null)

      if (result.success) {
        setIsCompleted(true)
        setSuccessMessage('Járnabinding skráð sem lokið!')
      } else {
        setError(result.error || 'Villa')
      }
    })
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/rebar/projects/${element.project_id}`} className="shrink-0">
          <Button variant="outline" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 truncate">
            {element.name}
          </h1>
          {element.project && (
            <p className="text-sm text-zinc-500 truncate">
              {element.project.name}
            </p>
          )}
        </div>
      </div>

      {/* Success */}
      {successMessage && (
        <Card className="p-5 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
            <p className="font-bold text-green-900 text-lg">{successMessage}</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="font-semibold text-red-900">{error}</p>
        </Card>
      )}

      {/* Element info cards — large and scannable */}
      <div className="grid grid-cols-2 gap-3">
        {element.weight_kg != null && (
          <Card className="p-4 text-center">
            <Weight className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-zinc-900">
              {element.weight_kg.toLocaleString('is-IS')}
            </div>
            <div className="text-xs text-zinc-500">kg</div>
          </Card>
        )}

        {hasDimensions && (
          <Card className="p-4 text-center">
            <Ruler className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <div className="text-sm font-bold text-zinc-900">
              {[element.length_mm, element.width_mm, element.height_mm]
                .filter((v) => v != null)
                .join(' × ')}
            </div>
            <div className="text-xs text-zinc-500">mm</div>
          </Card>
        )}

        {element.floor != null && (
          <Card className="p-4 text-center">
            <MapPin className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-zinc-900">
              {element.floor}
            </div>
            <div className="text-xs text-zinc-500">Hæð</div>
          </Card>
        )}

        <Card className="p-4 text-center">
          <Construction className="w-6 h-6 text-amber-600 mx-auto mb-1" />
          <div className="text-sm font-bold text-zinc-900">
            {element.element_type}
          </div>
          <div className="text-xs text-zinc-500">Tegund</div>
        </Card>
      </div>

      {/* Rebar spec — prominent display */}
      {element.rebar_spec && (
        <Card className="p-5 bg-amber-50 border-2 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Construction className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-amber-900">Járnagrind</h3>
          </div>
          <p className="text-amber-800 text-lg font-medium">{element.rebar_spec}</p>
        </Card>
      )}

      {/* Position / drawing reference */}
      {(element.position_description || element.drawing_reference) && (
        <Card className="p-4">
          {element.position_description && (
            <div className="mb-2">
              <span className="text-sm text-zinc-500">Staðsetning: </span>
              <span className="font-medium text-zinc-800">{element.position_description}</span>
            </div>
          )}
          {element.drawing_reference && (
            <div>
              <span className="text-sm text-zinc-500">Teikning: </span>
              <span className="font-medium text-zinc-800">{element.drawing_reference}</span>
            </div>
          )}
        </Card>
      )}

      {/* Production notes */}
      {element.production_notes && (
        <Card className="p-4">
          <h3 className="font-semibold text-zinc-800 mb-1">Athugasemdir</h3>
          <p className="text-zinc-600">{element.production_notes}</p>
        </Card>
      )}

      {/* Rebar documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-zinc-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Teikningar og skjöl
          </h3>
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 truncate">{doc.name}</p>
                  <p className="text-xs text-zinc-500">
                    {doc.category === 'rebar' ? 'Armering' : 'Teikning'}
                  </p>
                </div>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 ml-3"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Opna
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Checklist */}
      {sortedChecklist.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-zinc-800 text-lg">Gátlisti</h3>

          <div className="space-y-2">
            {sortedChecklist.map((item) => {
              const isRebarKey = REBAR_KEYS.includes(item.key)
              const isItemPending = isPending && pendingAction === item.key

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleChecklistToggle(item.key, item.checked)}
                  disabled={isPending}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                    item.checked
                      ? 'bg-green-50 border-green-300'
                      : isRebarKey
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isItemPending ? (
                      <Loader2 className="w-7 h-7 text-zinc-400 animate-spin shrink-0" />
                    ) : item.checked ? (
                      <CheckCircle className="w-7 h-7 text-green-600 shrink-0" />
                    ) : (
                      <div className={`w-7 h-7 rounded-full border-2 shrink-0 ${
                        isRebarKey ? 'border-amber-400' : 'border-zinc-300'
                      }`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className={`font-medium text-lg ${
                        item.checked ? 'text-green-800 line-through' : 'text-zinc-900'
                      }`}>
                        {item.label}
                      </span>
                      {item.checked && item.checked_by && (
                        <p className="text-xs text-green-600 mt-0.5">
                          {item.checked_by}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Mark rebar complete — big green button */}
      {element.status === 'rebar' && !isCompleted && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-white via-white to-transparent pt-6 z-30">
          <Button
            onClick={handleMarkComplete}
            disabled={isPending && pendingAction === 'complete'}
            className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg"
          >
            {isPending && pendingAction === 'complete' ? (
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-6 h-6 mr-2" />
            )}
            Járnabinding lokið
          </Button>
        </div>
      )}

      {/* Already completed */}
      {isCompleted && (
        <Card className="p-6 bg-green-50 border-2 border-green-300 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <p className="text-xl font-bold text-green-800">
            Járnabinding lokið
          </p>
          <p className="text-sm text-green-600 mt-1">
            Bíður eftir steypuskráningu frá verksmiðjustjóra
          </p>
        </Card>
      )}
    </div>
  )
}
