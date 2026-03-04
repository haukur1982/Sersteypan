'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings2, RefreshCw, Loader2 } from 'lucide-react'
import type { PanelizationConstraints } from '@/lib/panelization/types'

interface ConstraintsSidebarProps {
  constraints: PanelizationConstraints
  mode: 'wall' | 'filigran'
  isEditable: boolean
  isPending: boolean
  onUpdate: (constraints: Record<string, number>) => void
}

interface ConstraintField {
  key: string
  label: string
  hint: string
  unit: string
  min: number
  max: number
  step?: number
  camelKey: keyof PanelizationConstraints
}

const PANEL_FIELDS: ConstraintField[] = [
  {
    key: 'max_panel_width_mm',
    label: 'Hámarksbreidd plötu',
    hint: 'Stærsta plata sem steypuborð og krani ráða við. Plötur breiðari en þetta klippast sjálfkrafa.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'maxPanelWidthMm',
  },
  {
    key: 'preferred_panel_width_mm',
    label: 'Æskileg breidd',
    hint: 'Markbreidd sem kerfið reynir að ná. Plötur verða sem næst þessari breidd ef hægt er.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'preferredPanelWidthMm',
  },
  {
    key: 'min_panel_width_mm',
    label: 'Lágmarksbreidd',
    hint: 'Mjórri plötur sameinast nágrannum. Mjóar plötur eru erfiðar í framleiðslu og geta brotnað.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'minPanelWidthMm',
  },
  {
    key: 'max_panel_weight_kg',
    label: 'Hámarksþyngd',
    hint: 'Ræðst af kranataki á verksmiðju og á byggingarstað. Dæmigert: 8–12 tonn.',
    unit: 'kg',
    min: 100,
    max: 50000,
    camelKey: 'maxPanelWeightKg',
  },
  {
    key: 'joint_width_mm',
    label: 'Fúgubreidd',
    hint: 'Bil á milli platna sem fyllt er af fúguefni á byggingarstað. Stöðluð fúga: 20 mm.',
    unit: 'mm',
    min: 0,
    max: 100,
    camelKey: 'jointWidthMm',
  },
  {
    key: 'concrete_density_kg_m3',
    label: 'Steypuþéttleiki',
    hint: 'Notað til að reikna þyngd. Venjuleg steypa: 2400 kg/m³. Léttari steypa: ~1800 kg/m³.',
    unit: 'kg/m³',
    min: 1500,
    max: 3000,
    camelKey: 'concreteDensityKgM3',
  },
]

const TRANSPORT_FIELDS: ConstraintField[] = [
  {
    key: 'max_transport_width_mm',
    label: 'Hámarksbreidd á bíl',
    hint: 'Breidd bílpalls. Plötur standandi á bíl mega ekki vera breiðari en þetta.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'maxTransportWidthMm',
  },
  {
    key: 'max_transport_height_mm',
    label: 'Hámarkshæð á bíl',
    hint: 'Hámarkshæð farms á bílpalli, miðað við brúarhæð og vegareglur.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'maxTransportHeightMm',
  },
]

const TABLE_FIELDS: ConstraintField[] = [
  {
    key: 'max_table_length_mm',
    label: 'Hámarkslengd borðs',
    hint: 'Lengd steypuborðs í verksmiðju. Platan verður að rúmast á borðinu til steypingar.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'maxTableLengthMm',
  },
  {
    key: 'max_table_width_mm',
    label: 'Hámarksbreidd borðs',
    hint: 'Breidd steypuborðs. Ákvarðar hámarksbreidd plötunnar við steypingu.',
    unit: 'mm',
    min: 100,
    max: 50000,
    camelKey: 'maxTableWidthMm',
  },
]

export function ConstraintsSidebar({
  constraints,
  mode,
  isEditable,
  isPending,
  onUpdate,
}: ConstraintsSidebarProps) {
  // Local form state (initialized from constraints)
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of [...PANEL_FIELDS, ...TRANSPORT_FIELDS, ...TABLE_FIELDS]) {
      initial[field.key] = String(constraints[field.camelKey])
    }
    return initial
  })

  const handleChange = useCallback(
    (key: string, value: string) => {
      setFormValues((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleRecalculate = useCallback(() => {
    const numericValues: Record<string, number> = {}
    for (const field of [...PANEL_FIELDS, ...TRANSPORT_FIELDS, ...TABLE_FIELDS]) {
      const val = Number(formValues[field.key])
      if (!isNaN(val) && val >= field.min && val <= field.max) {
        numericValues[field.key] = val
      }
    }
    onUpdate(numericValues)
  }, [formValues, onUpdate])

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-zinc-500" />
          Skorður
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Panel constraints */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Plötumörk
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Stærð og þyngd hverrar plötu á steypuborði
            </p>
          </div>
          {PANEL_FIELDS.map((field) => (
            <ConstraintInput
              key={field.key}
              field={field}
              value={formValues[field.key]}
              onChange={handleChange}
              disabled={!isEditable}
            />
          ))}
        </div>

        {/* Transport constraints */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Flutningur
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Hámark vegna bílpalls og vegareglna
            </p>
          </div>
          {TRANSPORT_FIELDS.map((field) => (
            <ConstraintInput
              key={field.key}
              field={field}
              value={formValues[field.key]}
              onChange={handleChange}
              disabled={!isEditable}
            />
          ))}
        </div>

        {/* Factory table constraints */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Steypuborð
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Stærð borðs í verksmiðju — platan verður að passa
            </p>
          </div>
          {TABLE_FIELDS.map((field) => (
            <ConstraintInput
              key={field.key}
              field={field}
              value={formValues[field.key]}
              onChange={handleChange}
              disabled={!isEditable}
            />
          ))}
        </div>

        {/* Recalculate button */}
        {isEditable && (
          <Button
            onClick={handleRecalculate}
            disabled={isPending}
            className="w-full"
            size="sm"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Endurreikna
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function ConstraintInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ConstraintField
  value: string
  onChange: (key: string, value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-600">
        {field.label}{' '}
        <span className="text-zinc-400">({field.unit})</span>
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        min={field.min}
        max={field.max}
        step={field.step}
        disabled={disabled}
        className="h-8 text-sm"
      />
      <p className="text-[10px] text-zinc-400 leading-tight">{field.hint}</p>
    </div>
  )
}
