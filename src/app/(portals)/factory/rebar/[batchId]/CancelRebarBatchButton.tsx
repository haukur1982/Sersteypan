'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { cancelRebarBatch } from '@/lib/factory/rebar-batch-actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CancelRebarBatchButtonProps {
    batchId: string
}

export function CancelRebarBatchButton({ batchId }: CancelRebarBatchButtonProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleCancelClick = () => {
        if (!window.confirm('Ertu viss um að þú viljir afturkalla þessa járnalotu? \n\nÞetta mun setja allar einingar sem eru í þessari lotu aftur á "ósamansett" stig (tilbúnar í nýja lotu). Þessa aðgerð er ekki hægt að afturkalla.')) return

        startTransition(async () => {
            const result = await cancelRebarBatch(batchId)

            if (result?.error) {
                toast.error('Villa', {
                    description: result.error,
                })
            } else {
                toast.success('Afturkallað', {
                    description: 'Hætt hefur verið við járnalotuna og einingar losaðar.',
                })
                router.push('/factory/rebar') // Navigate back to main rebar view
                router.refresh()
            }
        })
    }

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelClick}
            disabled={isPending}
        >
            <Trash2 className="h-4 w-4 mr-2" />
            {isPending ? 'Er að afturkalla...' : 'Afturkalla Lotu'}
        </Button>
    )
}
