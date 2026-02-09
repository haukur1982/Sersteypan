'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { toggleFeatureFlag } from '@/lib/users/actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface FeatureTogglerProps {
    userId: string
    featureKey: string
    initialValue: boolean
    label?: string
}

export function FeatureToggler({ userId, featureKey, initialValue, label }: FeatureTogglerProps) {
    const [enabled, setEnabled] = useState(initialValue)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleToggle = async (checked: boolean) => {
        // Optimistic update
        setEnabled(checked)
        setLoading(true)

        try {
            const result = await toggleFeatureFlag(userId, featureKey, checked)

            if (result.error) {
                // Revert if error
                setEnabled(!checked)
                toast.error(`Error: ${result.error}`)
            } else {
                toast.success('Feature updated')
                router.refresh()
            }
        } catch {
            setEnabled(!checked)
            toast.error('Connection failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={loading}
            />
            {label && <span className="text-sm text-zinc-600">{label}</span>}
            {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
        </div>
    )
}
