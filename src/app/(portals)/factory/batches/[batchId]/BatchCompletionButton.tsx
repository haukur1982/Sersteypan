'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { completeBatch } from '@/lib/factory/batch-actions'
import type { ChecklistItem } from '@/lib/factory/batch-actions'

interface BatchCompletionButtonProps {
  batchId: string
  checklist: ChecklistItem[]
  elementCount?: number
}

export function BatchCompletionButton({ batchId, checklist, elementCount = 0 }: BatchCompletionButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const allChecked = checklist.every((item) => item.checked)

  async function handleComplete() {
    if (!allChecked) return

    setLoading(true)
    setError(null)

    const result = await completeBatch(batchId)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      setShowConfirm(false)
    } else {
      setShowConfirm(false)
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          onClick={() => {
            if (allChecked) {
              setShowConfirm(true)
            }
          }}
          disabled={!allChecked || loading}
          className={
            allChecked
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
          }
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ljúka lotu...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Ljúka steypulotu
            </>
          )}
        </Button>
        {!allChecked && (
          <p className="text-xs text-zinc-500">
            Öll atriði í gátlista verða að vera hakuð
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ljúka steypulotu?
            </DialogTitle>
            <DialogDescription className="text-left">
              Þetta breytir stöðu allra {elementCount > 0 ? `${elementCount} ` : ''}eininga í lotunni í <strong>&quot;Steypt&quot;</strong>.
              Þessi aðgerð er ekki afturkræf.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Gakktu úr skugga um að steypan sé komin í mótin og allt sé til reiðu áður en þú heldur áfram.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Hætta við
            </Button>
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ljúka lotu...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Staðfesta — Ljúka lotu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
