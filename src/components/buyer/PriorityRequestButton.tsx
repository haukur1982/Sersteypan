'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { requestPriority } from '@/lib/buyer/actions'

interface PriorityRequest {
  id: string
  status: 'pending' | 'approved' | 'denied' | 'modified'
}

interface PriorityRequestButtonProps {
  elementId: string
  elementName: string
  currentPriority: number
  pendingRequest?: PriorityRequest
}

/**
 * Button that opens a modal for requesting priority changes
 * Disabled if there's already a pending request
 */
export function PriorityRequestButton({
  elementId,
  elementName,
  currentPriority,
  pendingRequest
}: PriorityRequestButtonProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<string>(String(Math.min(currentPriority + 1, 10)))
  const [reason, setReason] = useState('')

  const hasPendingRequest = pendingRequest && pendingRequest.status === 'pending'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('elementId', elementId)
    formData.append('priority', selectedPriority)
    formData.append('reason', reason)

    const result = await requestPriority(formData)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      // Success - close dialog and reset form
      setOpen(false)
      setReason('')
      setSelectedPriority(String(Math.min(currentPriority + 1, 10)))
      setIsSubmitting(false)
    }
  }

  if (hasPendingRequest) {
    return (
      <Button disabled variant="outline" size="sm">
        <Flag className="w-4 h-4 mr-2" />
        Beiðni í vinnslu
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="w-4 h-4 mr-2" />
          Óska forgangs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Óska forgangs</DialogTitle>
            <DialogDescription>
              Sendu beiðni til framleiðslustjóra um að breyta forgangi fyrir{' '}
              <span className="font-medium">{elementName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="current-priority">
                Núverandi forgangur
              </Label>
              <div className="text-sm text-zinc-600">
                {currentPriority === 0 ? 'Enginn forgangur' : `Forgangur: ${currentPriority}`}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">
                Óskað forgangur *
              </Label>
              <Select
                value={selectedPriority}
                onValueChange={setSelectedPriority}
                required
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Veldu forgangsstig" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      Forgangur {num} {num >= 8 && '(hátt)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                Hærri tölur = meiri forgangur (10 er hæst)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">
                Ástæða beiðni *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Útskýrðu hvers vegna þú þarft þessa breytingu..."
                required
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-zinc-500 text-right">
                {reason.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Hætta við
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sendir...' : 'Senda beiðni'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
