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
  RotateCcw,
  FolderKanban,
  Construction,
} from 'lucide-react'
import { rebarLookupElementByQR } from '@/lib/rebar/actions'
import { startRebarWork } from '@/lib/rebar/actions'

interface ScannedElement {
  id: string
  name: string
  element_type: string
  status: string | null
  project_id: string
  rebar_spec: string | null
  project: { id: string; name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Skipulagt',
  rebar: 'Járnabinding',
  cast: 'Steypt',
  curing: 'Þornar',
  ready: 'Tilbúið',
  loaded: 'Á bíl',
  delivered: 'Afhent',
}

export function RebarScanClient() {
  const router = useRouter()
  const [scannedElement, setScannedElement] = useState<ScannedElement | null>(null)
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
      const result = await rebarLookupElementByQR(qrContent)

      if (result.error || !result.element) {
        setError(result.error || 'Eining fannst ekki.')
        return
      }

      setScannedElement(result.element)
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

  const handleStartRebar = () => {
    if (!scannedElement) return

    startTransition(async () => {
      const result = await startRebarWork(scannedElement.id)
      if (!result.success) {
        setError(result.error || 'Villa')
      } else {
        setSuccessMessage(`${scannedElement.name} → Járnabinding hafin`)
        setScannedElement((prev) =>
          prev ? { ...prev, status: 'rebar' } : null
        )
      }
    })
  }

  const handleViewDetail = () => {
    if (scannedElement) {
      router.push(`/rebar/element/${scannedElement.id}`)
    }
  }

  const handleReset = () => {
    setScannedElement(null)
    setError(null)
    setSuccessMessage(null)
    setManualSearch('')
  }

  const statusLabel = STATUS_LABELS[scannedElement?.status ?? ''] ?? scannedElement?.status

  return (
    <div className="space-y-5">
      {/* Scanner — only when no element scanned */}
      {!scannedElement && (
        <>
          <QRScanner
            onScan={handleScan}
            onError={(err) => setError(err)}
          />

          {/* Manual search */}
          <div className="pt-2 text-center">
            <Button
              variant="outline"
              onClick={() => setShowManualSearch(!showManualSearch)}
              className="w-full h-14 text-lg font-medium"
            >
              <Search className="w-5 h-5 mr-2 text-zinc-500" />
              {showManualSearch ? 'Fela leit' : 'Slá inn númer'}
            </Button>
          </div>

          {showManualSearch && (
            <form
              onSubmit={handleManualSearch}
              className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200"
            >
              <Input
                placeholder="Einingarnúmer (t.d. W-101)..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="h-14 text-lg"
                autoFocus
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="h-14 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Leita...
                  </>
                ) : (
                  'Leita'
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
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-5 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <XCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
            <p className="font-semibold text-red-900 text-lg">{error}</p>
          </div>
        </Card>
      )}

      {/* Success */}
      {successMessage && (
        <Card className="p-5 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
            <p className="font-semibold text-green-900 text-lg">{successMessage}</p>
          </div>
        </Card>
      )}

      {/* Scanned element result */}
      {scannedElement && (
        <Card className="p-6 border-2 border-zinc-200 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-5">
            {/* Element name — large for visibility */}
            <div>
              <p className="text-sm text-zinc-500 mb-1">Eining fundin</p>
              <h3 className="text-3xl font-bold text-zinc-900">
                {scannedElement.name}
              </h3>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Staða:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                scannedElement.status === 'planned'
                  ? 'bg-amber-100 text-amber-800'
                  : scannedElement.status === 'rebar'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-zinc-100 text-zinc-700'
              }`}>
                {statusLabel}
              </span>
            </div>

            {/* Project */}
            {scannedElement.project && (
              <div className="flex items-center gap-2 text-zinc-600">
                <FolderKanban className="w-5 h-5" />
                <span className="text-lg">{scannedElement.project.name}</span>
              </div>
            )}

            {/* Rebar spec */}
            {scannedElement.rebar_spec && (
              <div className="flex items-center gap-2 text-zinc-700">
                <Construction className="w-5 h-5 text-amber-600" />
                <span className="font-medium">{scannedElement.rebar_spec}</span>
              </div>
            )}

            {/* Action: Start rebar work */}
            {scannedElement.status === 'planned' && (
              <Button
                onClick={handleStartRebar}
                disabled={isPending}
                className="w-full h-16 text-xl font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                {isPending ? (
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                  <Construction className="w-6 h-6 mr-2" />
                )}
                Hefja járnabindingu
              </Button>
            )}

            {/* Action: View detail (for elements already in rebar) */}
            {scannedElement.status === 'rebar' && (
              <Button
                onClick={handleViewDetail}
                className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                Opna gátlista
              </Button>
            )}

            {/* Element not in rebar flow */}
            {scannedElement.status !== 'planned' && scannedElement.status !== 'rebar' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <p className="text-zinc-600 font-medium">
                  Þessi eining er ekki í járnabindingu ({statusLabel})
                </p>
              </div>
            )}

            {/* Reset */}
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full h-14 text-lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Skanna aðra einingu
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
