'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { ProductionChecklist } from '@/components/factory/ProductionChecklist'
import type { ChecklistItem } from '@/lib/factory/batch-actions'

// ─── Context ────────────────────────────────────────────────
interface BatchChecklistCtx {
  checklist: ChecklistItem[]
  updateChecklist: (items: ChecklistItem[]) => void
}

const Ctx = createContext<BatchChecklistCtx | null>(null)

export function useBatchChecklist(): BatchChecklistCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBatchChecklist must be inside BatchChecklistProvider')
  return ctx
}

// ─── Provider ───────────────────────────────────────────────

/**
 * Wraps the batch detail page. Holds the live checklist state so
 * ProductionChecklist and BatchCompletionButton can share it
 * despite being in different parts of the DOM tree.
 *
 * Before this, we relied on `router.refresh()` after every toggle —
 * which caused the page to freeze during concurrent re-rendering.
 */
export function BatchChecklistProvider({
  initialChecklist,
  children,
}: {
  initialChecklist: ChecklistItem[]
  children: ReactNode
}) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist)
  const updateChecklist = useCallback((items: ChecklistItem[]) => {
    setChecklist(items)
  }, [])

  return (
    <Ctx.Provider value={{ checklist, updateChecklist }}>
      {children}
    </Ctx.Provider>
  )
}

// ─── Connected Checklist ────────────────────────────────────

interface ConnectedChecklistProps {
  batchId: string
  disabled: boolean
  profiles: Record<string, { id: string; full_name: string }>
}

/**
 * Thin wrapper that connects ProductionChecklist to the shared context.
 * When items are toggled, the context updates → BatchCompletionButton
 * sees the new state immediately.
 */
export function ConnectedChecklist({ batchId, disabled, profiles }: ConnectedChecklistProps) {
  const { checklist, updateChecklist } = useBatchChecklist()

  return (
    <ProductionChecklist
      batchId={batchId}
      checklist={checklist}
      disabled={disabled}
      profiles={profiles}
      onChecklistChange={updateChecklist}
    />
  )
}
