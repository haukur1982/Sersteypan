'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Layers, Calendar, Truck, FileText, ExternalLink } from 'lucide-react'
import type { BatchRecord } from '@/lib/factory/batch-actions'

const statusLabels: Record<string, { label: string; className: string }> = {
  preparing: { label: 'Undirbúningur', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  checklist: { label: 'Gátlisti', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Lokið', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Afturkallað', className: 'bg-red-100 text-red-800 border-red-200' },
}

interface BatchDetailCardProps {
  batch: BatchRecord
  /** Show the sibling elements list */
  showElements?: boolean
  /** The current element ID (to highlight in the sibling list) */
  currentElementId?: string
}

export function BatchDetailCard({
  batch,
  showElements = false,
  currentElementId,
}: BatchDetailCardProps) {
  const statusInfo = statusLabels[batch.status] || statusLabels.preparing

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span className="font-mono">{batch.batch_number}</span>
          </div>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Batch info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(batch.batch_date).toLocaleDateString('is-IS')}</span>
          </div>
          {batch.concrete_grade && (
            <div className="flex items-center gap-1.5 text-zinc-600">
              <Truck className="h-3.5 w-3.5" />
              <span>{batch.concrete_grade}</span>
            </div>
          )}
          {batch.concrete_supplier && (
            <div className="text-zinc-600 col-span-2">
              Steypuverksmiðja: {batch.concrete_supplier}
            </div>
          )}
        </div>

        {/* Concrete slip link */}
        {batch.concrete_slip_url && (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-zinc-500" />
            <a
              href={batch.concrete_slip_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {batch.concrete_slip_name || 'Steypuskýrsla'}
            </a>
          </div>
        )}

        {/* Element count */}
        {batch.elements && (
          <p className="text-sm text-zinc-600">
            {batch.elements.length} einingar í lotu
          </p>
        )}

        {/* Sibling elements list */}
        {showElements && batch.elements && batch.elements.length > 0 && (
          <div className="border-t border-zinc-100 pt-3 mt-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
              Einingar í sömu lotu
            </p>
            <div className="space-y-1">
              {batch.elements.map((element) => (
                <div
                  key={element.id}
                  className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                    element.id === currentElementId
                      ? 'bg-blue-50 text-blue-900 font-medium'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span>{element.name}</span>
                  {element.weight_kg && (
                    <span className="text-xs text-zinc-400 tabular-nums">
                      {element.weight_kg.toLocaleString('is-IS')} kg
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to batch detail */}
        <Button variant="outline" size="sm" asChild className="w-full mt-2">
          <Link href={`/factory/batches/${batch.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Opna steypulotu
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
