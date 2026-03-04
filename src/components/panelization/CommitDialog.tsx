'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { commitPanelizationToElements } from '@/lib/panelization/actions'
import { useRouter } from 'next/navigation'

interface CommitDialogProps {
  layoutId: string
  panelCount: number
  warningCount: number
  totalWeight: number
}

/**
 * Confirmation dialog for committing panelization panels to real elements.
 * Shows a summary of what will be created and warns about constraint violations.
 */
export function CommitDialog({
  layoutId,
  panelCount,
  warningCount,
  totalWeight,
}: CommitDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleCommit = () => {
    setError(null)
    startTransition(async () => {
      const result = await commitPanelizationToElements(layoutId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Short delay so user sees success, then refresh the page
        setTimeout(() => {
          setOpen(false)
          router.refresh()
        }, 1500)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          setError(null)
          setSuccess(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={panelCount === 0}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Stofna einingar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stofna einingar úr plötuniði</DialogTitle>
          <DialogDescription>
            Þetta býr til raunverulegar einingar í verkefninu sem hægt er að
            framleiða og afhenda.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-green-900">
              {panelCount} einingar stofnaðar!
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Einingar birtast nú í verkefninu.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Fjöldi eininga</span>
                  <span className="font-medium">{panelCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Heildarþyngd</span>
                  <span className="font-medium tabular-nums">
                    {totalWeight.toLocaleString('is-IS')} kg
                  </span>
                </div>
              </div>

              {warningCount > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {warningCount} plötur fara yfir eitt eða fleiri skorðumörk.
                    Einingar verða samt stofnaðar, en athugaðu þyngd og
                    flutningstak.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Hætta við
              </Button>
              <Button onClick={handleCommit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stofna...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Staðfesta og stofna
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
