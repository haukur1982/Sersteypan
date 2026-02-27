'use client'

import { Badge } from '@/components/ui/badge'
import { useRealtimeBatch } from '@/lib/hooks/useRealtimeBatch'

const statusLabels: Record<string, { label: string; className: string }> = {
  preparing: { label: 'Undirbúningur', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  checklist: { label: 'Gátlisti tilbúinn', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Lokið', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Afturkallað', className: 'bg-red-100 text-red-800 border-red-200' },
}

interface BatchStatusBadgeProps {
  batchId: string
  initialStatus: string
}

/**
 * Realtime-aware batch status badge.
 *
 * Subscribes to Supabase Realtime changes on the specific batch row.
 * When the batch status changes in the DB (e.g. preparing → completed),
 * the badge updates instantly without requiring a page refresh.
 */
export function BatchStatusBadge({ batchId, initialStatus }: BatchStatusBadgeProps) {
  const { batch } = useRealtimeBatch({ id: batchId, status: initialStatus })
  const status = (batch as { status: string }).status || initialStatus
  const info = statusLabels[status] || statusLabels.preparing

  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  )
}
