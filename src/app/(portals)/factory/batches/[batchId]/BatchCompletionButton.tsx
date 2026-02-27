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
import { CheckCircle, Loader2, AlertTriangle, SkipForward } from 'lucide-react'
import { completeBatch } from '@/lib/factory/batch-actions'
import { useBatchChecklist } from './BatchChecklistSection'

interface BatchCompletionButtonProps {
  batchId: string
  elementCount?: number
  /** Allow skipping the checklist (admin only) */
  allowSkip?: boolean
}

export function BatchCompletionButton({
  batchId,
  elementCount = 0,
  allowSkip = false,
}: BatchCompletionButtonProps) {
  const router = useRouter()
  const { checklist } = useBatchChecklist()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const allChecked = checklist.every((item) => item.checked)

  async function handleComplete(skipChecklist = false) {
    if (!allChecked && !skipChecklist) return

    setLoading(true)
    setError(null)

    const result = await completeBatch(batchId, skipChecklist)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      setShowConfirm(false)
      setShowSkipConfirm(false)
    } else {
      setShowConfirm(false)
      setShowSkipConfirm(false)
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {/* Skip checklist button (admin only) */}
          {allowSkip && !allChecked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSkipConfirm(true)}
              disabled={loading}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Sleppa gátlista
            </Button>
          )}

          {/* Complete batch button */}
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
        </div>
        {!allChecked && !allowSkip && (
          <p className="text-xs text-zinc-500">
            Öll atriði í gátlista verða að vera hakuð
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Normal completion dialog */}
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
              onClick={() => handleComplete(false)}
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

      {/* Skip checklist confirmation dialog */}
      <Dialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Sleppa gátlista?
            </DialogTitle>
            <DialogDescription className="text-left">
              Þú ert að fara að ljúka lotu <strong>án þess að klára gátlistann</strong>.
              Þetta verður skráð í athugasemdir lotunnar.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              Aðeins stjórnendur geta sleppt gátlista. Notaðu þetta aðeins í undantekningartilvikum.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSkipConfirm(false)}
              disabled={loading}
            >
              Hætta við
            </Button>
            <Button
              onClick={() => handleComplete(true)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ljúka lotu...
                </>
              ) : (
                <>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Sleppa og ljúka lotu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
