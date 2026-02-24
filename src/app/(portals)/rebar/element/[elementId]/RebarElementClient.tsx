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
import { markRebarComplete } from '@/lib/rebar/actions'

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
  qr_code_url: string | null
  production_notes: string | null
  project_id: string
  piece_count: number | null
  rebar_done_count: number | null
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

export function RebarElementClient({ element, documents }: RebarElementClientProps) {
  const pieceCount = element.piece_count ?? 1
  const [rebarDoneCount, setRebarDoneCount] = useState(element.rebar_done_count ?? 0)
  const isFullyCompleted = rebarDoneCount >= pieceCount
  const [isCompleted, setIsCompleted] = useState(!!element.rebar_completed_at || isFullyCompleted)
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasDimensions =
    element.length_mm != null ||
    element.width_mm != null ||
    element.height_mm != null

  const handleMarkComplete = () => {
    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = await markRebarComplete(element.id)

      if (result.success) {
        const newDone = rebarDoneCount + 1
        setRebarDoneCount(newDone)

        if (newDone >= pieceCount) {
          setIsCompleted(true)
          setSuccessMessage('Járnabinding skráð sem lokið!')
        } else {
          setSuccessMessage(`Járnabinding lokið fyrir stk ${newDone}/${pieceCount}`)
        }
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

      {/* Piece progress — shown when piece_count > 1 */}
      {pieceCount > 1 && !isCompleted && (
        <Card className="p-4 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">Fjöldi stk: {pieceCount}</p>
              <p className="text-sm text-blue-700">
                {rebarDoneCount}/{pieceCount} lokið
              </p>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: pieceCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < rebarDoneCount
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-200 text-blue-700'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Mark rebar complete — big green button */}
      {element.status === 'rebar' && !isCompleted && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-white via-white to-transparent pt-6 z-30">
          <Button
            onClick={handleMarkComplete}
            disabled={isPending}
            className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg"
          >
            {isPending ? (
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-6 h-6 mr-2" />
            )}
            {pieceCount > 1
              ? `Járnabinding lokið (${rebarDoneCount + 1}/${pieceCount})`
              : 'Járnabinding lokið'}
          </Button>
        </div>
      )}

      {/* Already completed */}
      {isCompleted && (
        <Card className="p-6 bg-green-50 border-2 border-green-300 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <p className="text-xl font-bold text-green-800">
            Járnabinding lokið
            {pieceCount > 1 && ` (${pieceCount}/${pieceCount})`}
          </p>
          <p className="text-sm text-green-600 mt-1">
            Bíður eftir steypuskráningu frá verksmiðjustjóra
          </p>
        </Card>
      )}
    </div>
  )
}
