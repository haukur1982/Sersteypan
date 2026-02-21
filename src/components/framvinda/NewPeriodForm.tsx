'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPeriod } from '@/lib/framvinda/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'

interface Props {
  contractId: string
  projectId: string
  nextPeriodNumber: number
  defaultVisitala: number
  defaultGrunnvisitala: number
}

export function FramvindaNewPeriodForm({
  contractId,
  projectId,
  nextPeriodNumber,
  defaultVisitala,
  defaultGrunnvisitala,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const periodStart = form.get('periodStart') as string
    const periodEnd = form.get('periodEnd') as string
    const visitala = parseFloat(form.get('visitala') as string)
    const grunnvisitala = parseFloat(form.get('grunnvisitala') as string)

    const result = await createPeriod(contractId, periodStart, periodEnd, visitala, grunnvisitala)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.periodId) {
      router.push(`/admin/framvinda/${projectId}/${result.periodId}`)
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="mr-1 h-4 w-4" />
        Ný framvinda (nr. {nextPeriodNumber})
      </Button>
    )
  }

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardContent className="pt-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-4">
          Ný framvinda — Tímabil {nextPeriodNumber}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Upphafsdagur</Label>
              <Input
                id="periodStart"
                name="periodStart"
                type="date"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Lokadagur</Label>
              <Input
                id="periodEnd"
                name="periodEnd"
                type="date"
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grunnvisitala">Grunnvísitala</Label>
              <Input
                id="grunnvisitala"
                name="grunnvisitala"
                type="number"
                step="0.1"
                defaultValue={defaultGrunnvisitala}
                required
                disabled={loading}
              />
              <p className="text-xs text-zinc-400">Grunnvísitala fyrir þetta tímabil</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitala">Vísitala</Label>
              <Input
                id="visitala"
                name="visitala"
                type="number"
                step="0.1"
                defaultValue={defaultVisitala}
                required
                disabled={loading}
              />
              <p className="text-xs text-zinc-400">Núverandi vísitala byggingarframkvæmda</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bý til...
                </>
              ) : (
                'Búa til tímabil'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Hætta við
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
