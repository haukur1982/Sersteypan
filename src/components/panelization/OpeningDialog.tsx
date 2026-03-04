'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'

interface OpeningDialogProps {
  surfaceLengthMm: number
  surfaceHeightMm: number
  onAdd: (openingData: Record<string, unknown>) => void
  isPending: boolean
}

/**
 * Dialog for adding a window, door, or other opening to a wall layout.
 * Validates that the opening fits within the surface dimensions.
 */
export function OpeningDialog({
  surfaceLengthMm,
  surfaceHeightMm,
  onAdd,
  isPending,
}: OpeningDialogProps) {
  const [open, setOpen] = useState(false)
  const [openingType, setOpeningType] = useState<string>('window')
  const [offsetX, setOffsetX] = useState('')
  const [offsetY, setOffsetY] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setOpeningType('window')
    setOffsetX('')
    setOffsetY('')
    setWidth('')
    setHeight('')
    setLabel('')
    setError(null)
  }

  const handleSubmit = () => {
    setError(null)

    const ox = Number(offsetX)
    const oy = Number(offsetY)
    const w = Number(width)
    const h = Number(height)

    // Basic validation
    if (isNaN(ox) || isNaN(oy) || isNaN(w) || isNaN(h)) {
      setError('Öll svæði verða að vera tölur')
      return
    }

    if (w <= 0 || h <= 0) {
      setError('Breidd og hæð verða að vera jákvæðar')
      return
    }

    if (ox + w > surfaceLengthMm) {
      setError(
        `Op fer út fyrir vegg. Hámark: ${surfaceLengthMm - ox} mm breidd á þessari staðsetningu.`
      )
      return
    }

    if (oy + h > surfaceHeightMm) {
      setError(
        `Op fer út fyrir vegg. Hámark: ${surfaceHeightMm - oy} mm hæð á þessari staðsetningu.`
      )
      return
    }

    onAdd({
      opening_type: openingType,
      offset_x_mm: ox,
      offset_y_mm: oy,
      width_mm: w,
      height_mm: h,
      label: label || undefined,
    })

    resetForm()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Bæta við opi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nýtt op</DialogTitle>
          <DialogDescription>
            Bættu glugga, hurð eða öðru opi við veggflötinn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opening type */}
          <div className="space-y-2">
            <Label>Tegund</Label>
            <Select value={openingType} onValueChange={setOpeningType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="window">Gluggi</SelectItem>
                <SelectItem value="door">Hurð</SelectItem>
                <SelectItem value="other">Annað</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Staðsetning frá neðra-vinstra horni (mm)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">
                  Lárétt (X)
                </span>
                <Input
                  type="number"
                  value={offsetX}
                  onChange={(e) => setOffsetX(e.target.value)}
                  placeholder="0"
                  min={0}
                  max={surfaceLengthMm}
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">
                  Lóðrétt (Y)
                </span>
                <Input
                  type="number"
                  value={offsetY}
                  onChange={(e) => setOffsetY(e.target.value)}
                  placeholder="0"
                  min={0}
                  max={surfaceHeightMm}
                />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <Label>Stærð (mm)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">
                  Breidd
                </span>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder={openingType === 'door' ? '900' : '1200'}
                  min={1}
                  max={surfaceLengthMm}
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">Hæð</span>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={openingType === 'door' ? '2100' : '1200'}
                  min={1}
                  max={surfaceHeightMm}
                />
              </div>
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label>Merking (valfrjálst)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="T.d. G-01 eða H-01"
              maxLength={100}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm()
              setOpen(false)
            }}
            disabled={isPending}
          >
            Hætta við
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Bæta við
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
