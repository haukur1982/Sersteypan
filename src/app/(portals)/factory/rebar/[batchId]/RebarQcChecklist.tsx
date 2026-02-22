'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardCheck, Loader2, User, Clock } from 'lucide-react'
import { updateRebarChecklistItem } from '@/lib/factory/rebar-batch-actions'
import type { RebarChecklistItem } from '@/lib/factory/rebar-batch-actions'
import { useRealtimeRebarBatches } from '@/lib/hooks/useRealtimeRebarBatches'

interface CheckerProfile {
  id: string
  full_name: string
}

interface RebarQcChecklistProps {
  batchId: string
  checklist: RebarChecklistItem[]
  disabled?: boolean
  profiles?: Record<string, CheckerProfile>
}

export function RebarQcChecklist({
  batchId,
  checklist,
  disabled = false,
  profiles = {},
}: RebarQcChecklistProps) {
  const router = useRouter()

  const { batches } = useRealtimeRebarBatches([{ id: batchId, checklist }])
  const currentChecklist = (batches[0]?.checklist as unknown as RebarChecklistItem[]) || checklist

  const [items, setItems] = useState<RebarChecklistItem[]>(currentChecklist)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync with realtime updates
  useEffect(() => {
    setItems(currentChecklist)
  }, [currentChecklist])

  const completedCount = items.filter((item) => item.checked).length
  const totalCount = items.length
  const allComplete = completedCount === totalCount

  async function handleToggle(key: string, checked: boolean) {
    if (disabled) return
    setLoadingKey(key)
    setError(null)

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
            ...item,
            checked,
            checked_at: checked ? new Date().toISOString() : null,
          }
          : item
      )
    )

    const result = await updateRebarChecklistItem(batchId, key, checked)

    if (result.error) {
      setError(result.error)
      // Revert optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.key === key
            ? {
              ...item,
              checked: !checked,
              checked_at: item.checked_at,
            }
            : item
        )
      )
    } else {
      router.refresh()
    }

    setLoadingKey(null)
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleString('is-IS', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <Card className={`border-zinc-200 ${allComplete ? 'border-green-200 bg-green-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <ClipboardCheck className={`h-5 w-5 ${allComplete ? 'text-green-600' : 'text-orange-600'}`} />
            Gátlisti járnagrinda
          </div>
          <Badge
            variant="outline"
            className={
              allComplete
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-zinc-100 text-zinc-800'
            }
          >
            {completedCount} / {totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${item.checked ? 'bg-green-50' : 'hover:bg-zinc-50'
              }`}
          >
            <div className="pt-0.5">
              {loadingKey === item.key ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) =>
                    handleToggle(item.key, checked === true)
                  }
                  disabled={disabled || loadingKey !== null}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${item.checked ? 'text-green-800 line-through' : 'text-zinc-900'
                  }`}
              >
                {item.label}
              </p>
              {item.checked && (item.checked_by || item.checked_at) && (
                <div className="flex items-center gap-3 mt-0.5">
                  {item.checked_by && profiles[item.checked_by] && (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <User className="h-3 w-3" />
                      {profiles[item.checked_by].full_name}
                    </span>
                  )}
                  {item.checked_at && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.checked_at)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {allComplete && !disabled && (
          <p className="text-sm text-green-700 font-medium mt-3 text-center">
            Allir liðir hakað — tilbúið til samþykktar
          </p>
        )}
      </CardContent>
    </Card>
  )
}
