'use client'

import { useState, useActionState } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { createPanelizationLayout } from '@/lib/panelization/actions'
import {
  DEFAULT_WALL_THICKNESS_MM,
  DEFAULT_FLOOR_HEIGHT_MM,
  DEFAULT_FILIGRAN_THICKNESS_MM,
} from '@/lib/panelization/types'

interface Building {
  id: string
  name: string
}

interface PanelizationCreateDialogProps {
  projectId: string
  buildings: Building[]
}

export function PanelizationCreateDialog({
  projectId,
  buildings,
}: PanelizationCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'wall' | 'filigran'>('wall')
  const [state, formAction, isPending] = useActionState(createPanelizationLayout, {
    error: '',
  })

  // Default values based on mode
  const defaultThickness =
    mode === 'wall' ? DEFAULT_WALL_THICKNESS_MM : DEFAULT_FILIGRAN_THICKNESS_MM
  const defaultHeight =
    mode === 'wall' ? DEFAULT_FLOOR_HEIGHT_MM : 0
  const defaultPrefix = mode === 'wall' ? 'V' : 'F'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nýtt plötusnið
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nýtt plötusnið</DialogTitle>
          <DialogDescription>
            Skilgreindu yfirborðið sem á að skipta niður í einingar.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {/* Hidden project_id */}
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="name_prefix" value={defaultPrefix} />

          {/* Mode selector */}
          <div className="space-y-2">
            <Label>Tegund</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  mode === 'wall'
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
                onClick={() => setMode('wall')}
              >
                <span className="font-medium text-sm block">Veggur</span>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  Skipta vegg í lóðréttar plötur. Op (gluggar/hurðir) ákvarða skiptipunkta.
                </span>
              </button>
              <button
                type="button"
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  mode === 'filigran'
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
                onClick={() => setMode('filigran')}
              >
                <span className="font-medium text-sm block">Filigran</span>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  Skipta gólfflöt í samhliða remsur (60 mm forstentar plötur).
                </span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="panel-name">Heiti</Label>
            <Input
              id="panel-name"
              name="name"
              placeholder={
                mode === 'wall'
                  ? 'T.d. Norðurveggur 1H'
                  : 'T.d. Gólfplata 1H'
              }
              required
            />
          </div>

          {/* Building selector */}
          {buildings.length > 0 && (
            <div className="space-y-2">
              <Label>Bygging (valfrjálst)</Label>
              <Select name="building_id">
                <SelectTrigger>
                  <SelectValue placeholder="Veldu byggingu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Engin bygging</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Floor */}
          <div className="space-y-2">
            <Label htmlFor="panel-floor">Hæð</Label>
            <Input
              id="panel-floor"
              name="floor"
              type="number"
              min={0}
              max={99}
              defaultValue={1}
            />
          </div>

          {/* Surface dimensions */}
          <div className="space-y-2">
            <Label>
              {mode === 'wall' ? 'Veggflötur (mm)' : 'Gólfflötur (mm)'}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">
                  {mode === 'wall' ? 'Lengd' : 'Lengd'}
                </span>
                <Input
                  name="surface_length_mm"
                  type="number"
                  placeholder="12000"
                  min={1}
                  max={50000}
                  required
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">
                  {mode === 'wall' ? 'Hæð' : 'Breidd'}
                </span>
                <Input
                  name="surface_height_mm"
                  type="number"
                  placeholder={
                    mode === 'wall'
                      ? String(DEFAULT_FLOOR_HEIGHT_MM)
                      : '6000'
                  }
                  defaultValue={defaultHeight || undefined}
                  min={1}
                  max={50000}
                  required
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500 mb-1 block">Þykkt</span>
                <Input
                  name="thickness_mm"
                  type="number"
                  placeholder={String(defaultThickness)}
                  defaultValue={defaultThickness}
                  min={10}
                  max={500}
                  required
                />
              </div>
            </div>
          </div>

          {/* Strip direction (filigran only) */}
          {mode === 'filigran' && (
            <div className="space-y-2">
              <Label>Stefna remsna</Label>
              <Select name="strip_direction" defaultValue="length">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="length">
                    Meðfram lengd
                  </SelectItem>
                  <SelectItem value="width">
                    Meðfram breidd
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error display */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Hætta við
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stofna...
                </>
              ) : (
                'Stofna plötusnið'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
