'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { QRScanner } from '@/components/shared/QRScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  Ruler,
  Weight,
  FolderKanban,
} from 'lucide-react'
import { factoryLookupElementByQR } from '@/lib/factory/scan-actions'
import { updateElementStatus } from '@/lib/elements/actions'

// ── Status configuration ───────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  planned: { label: 'Skipulagt', color: 'text-zinc-700', bg: 'bg-zinc-100' },
  rebar: {
    label: 'Járnabundið',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
  },
  cast: { label: 'Steypt', color: 'text-blue-700', bg: 'bg-blue-100' },
  curing: { label: 'Þornar', color: 'text-purple-700', bg: 'bg-purple-100' },
  ready: { label: 'Tilbúið', color: 'text-green-700', bg: 'bg-green-100' },
  loaded: { label: 'Á bíl', color: 'text-orange-700', bg: 'bg-orange-100' },
  delivered: {
    label: 'Afhent',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
  },
}

// Valid next status transitions for factory production flow
const NEXT_STATUS: Record<string, { status: string; label: string; buttonColor: string }[]> = {
  planned: [
    { status: 'rebar', label: 'Byrja járnagrind', buttonColor: 'bg-amber-600 hover:bg-amber-700' },
  ],
  rebar: [
    { status: 'cast', label: 'Steypt', buttonColor: 'bg-blue-600 hover:bg-blue-700' },
  ],
  cast: [
    { status: 'curing', label: 'Í hersluprosessu', buttonColor: 'bg-purple-600 hover:bg-purple-700' },
  ],
  curing: [
    { status: 'ready', label: 'Tilbúið', buttonColor: 'bg-green-600 hover:bg-green-700' },
  ],
}

interface ScannedElement {
  id: string
  name: string
  element_type: string
  status: string
  weight_kg: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  project: {
    id: string
    name: string
    address: string | null
  } | null
}

export function FactoryScanClient() {
  const router = useRouter()
  const [scannedElement, setScannedElement] = useState<ScannedElement | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [manualSearch, setManualSearch] = useState('')
  const [showManualSearch, setShowManualSearch] = useState(false)

  const lookupElement = async (qrContent: string) => {
    setIsLoading(true)
    setError(null)
    setScannedElement(null)
    setSuccessMessage(null)

    try {
      const result = await factoryLookupElementByQR(qrContent)

      if (result.error || !result.element) {
        setError(result.error || 'Eining fannst ekki.')
        return
      }

      setScannedElement(result.element as unknown as ScannedElement)
    } catch {
      setError('Villa við leit. Reyndu aftur.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScan = (decodedText: string) => {
    lookupElement(decodedText.trim())
  }

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualSearch.trim()) {
      lookupElement(manualSearch.trim())
    }
  }

  const handleStatusUpdate = (newStatus: string, label: string) => {
    if (!scannedElement) return

    startTransition(async () => {
      const result = await updateElementStatus(scannedElement.id, newStatus)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccessMessage(
          `${scannedElement.name} → ${label}`
        )
        // Update local state to reflect the new status
        setScannedElement((prev) =>
          prev ? { ...prev, status: newStatus } : null
        )
      }
    })
  }

  const handleReset = () => {
    setScannedElement(null)
    setError(null)
    setSuccessMessage(null)
    setManualSearch('')
  }

  const handleViewDetail = () => {
    if (scannedElement) {
      router.push(`/factory/production/${scannedElement.id}`)
    }
  }

  const statusConfig =
    STATUS_CONFIG[scannedElement?.status ?? 'planned'] ?? STATUS_CONFIG.planned
  const nextActions = scannedElement
    ? (NEXT_STATUS[scannedElement.status] ?? [])
    : []
  const hasDimensions =
    scannedElement &&
    (scannedElement.length_mm != null ||
      scannedElement.width_mm != null ||
      scannedElement.height_mm != null)

  return (
    <div className="space-y-5">
      {/* Scanner — only when no element scanned */}
      {!scannedElement && (
        <>
          <QRScanner
            onScan={handleScan}
            onError={(err) => setError(err)}
          />

          {/* Manual search toggle */}
          <div className="pt-2 text-center">
            <Button
              variant="outline"
              onClick={() => setShowManualSearch(!showManualSearch)}
              className="w-full h-12 text-base font-medium"
            >
              <Search className="w-5 h-5 mr-2 text-zinc-500" />
              {showManualSearch
                ? 'Fela handvirka leit'
                : 'Slá inn númer handvirkt'}
            </Button>
          </div>

          {showManualSearch && (
            <form
              onSubmit={handleManualSearch}
              className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-lg border border-zinc-200"
            >
              <Input
                placeholder="Einingarnúmer (t.d. W-101)..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Leita...
                  </>
                ) : (
                  'Leita að einingu'
                )}
              </Button>
            </form>
          )}
        </>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <span className="ml-3 text-zinc-600">Leita a&eth; einingu...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <p className="font-medium text-red-900">{error}</p>
          </div>
        </Card>
      )}

      {/* Success message */}
      {successMessage && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <p className="font-medium text-green-900">{successMessage}</p>
          </div>
        </Card>
      )}

      {/* Scanned element result */}
      {scannedElement && (
        <Card className="p-5 border-2 border-zinc-200 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-500">Eining fundin</p>
                <h3 className="text-2xl font-bold text-zinc-900">
                  {scannedElement.name}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* Project */}
            {scannedElement.project && (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <FolderKanban className="w-4 h-4" />
                <span>{scannedElement.project.name}</span>
              </div>
            )}

            {/* Dimensions + weight */}
            <div className="flex flex-wrap gap-4 text-sm">
              {scannedElement.weight_kg != null && (
                <div className="flex items-center gap-1.5 text-zinc-700">
                  <Weight className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">
                    {scannedElement.weight_kg.toLocaleString('is-IS')} kg
                  </span>
                </div>
              )}
              {hasDimensions && (
                <div className="flex items-center gap-1.5 text-zinc-700">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  <span>
                    {[
                      scannedElement.length_mm,
                      scannedElement.width_mm,
                      scannedElement.height_mm,
                    ]
                      .filter((v) => v != null)
                      .join(' × ')}{' '}
                    mm
                  </span>
                </div>
              )}
            </div>

            {/* Status transition buttons */}
            {nextActions.length > 0 && (
              <div className="space-y-2 pt-2">
                {nextActions.map((action) => (
                  <Button
                    key={action.status}
                    onClick={() =>
                      handleStatusUpdate(action.status, action.label)
                    }
                    disabled={isPending}
                    className={`w-full h-14 text-lg font-semibold text-white ${action.buttonColor}`}
                  >
                    {isPending ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5 mr-2" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Already at terminal production stage */}
            {nextActions.length === 0 && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm text-zinc-600">
                <p className="font-medium">
                  Engin n&aelig;sta sta&eth;a &iacute; framlei&eth;slu
                </p>
                <p>
                  Eining er{' '}
                  <span className="font-semibold">
                    {statusConfig.label.toLowerCase()}
                  </span>
                  .
                </p>
              </div>
            )}

            {/* Secondary actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleViewDetail}
                className="flex-1 h-11"
              >
                Sj&aacute; n&aacute;nar
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 h-11"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Skanna a&eth;ra
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
