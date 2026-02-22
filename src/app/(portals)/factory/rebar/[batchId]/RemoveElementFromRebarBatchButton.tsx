'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { removeElementFromRebarBatch } from '@/lib/factory/rebar-batch-actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface RemoveElementFromRebarBatchButtonProps {
    batchId: string
    elementId: string
    elementName: string
}

export function RemoveElementFromRebarBatchButton({ batchId, elementId, elementName }: RemoveElementFromRebarBatchButtonProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm(`Ertu viss um að þú viljir fjarlægja ${elementName} úr járnalotunni?`)) return

        startTransition(async () => {
            const result = await removeElementFromRebarBatch(elementId, batchId)

            if (result?.error) {
                toast.error('Villa við að fjarlægja einingu', {
                    description: result.error,
                })
            } else {
                toast.success('Eining fjarlægð', {
                    description: `${elementName} var fjarlægð úr járnalotunni.`,
                })
                router.refresh()
            }
        })
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleRemove}
            disabled={isPending}
            title="Fjarlægja einingu úr lotu"
        >
            <X className="h-4 w-4" />
        </Button>
    )
}
