'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRevision } from '@/lib/framvinda/actions'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowRight } from 'lucide-react'

export function NewRevisionClient({
    contractId,
    projectId,
}: {
    contractId: string
    projectId: string
}) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleCreate() {
        setError('')
        if (!name.trim()) {
            setError('Heiti á viðbót vantar')
            return
        }

        setSaving(true)
        const result = await createRevision(contractId, name.trim())

        if (result.error) {
            setError(result.error)
            setSaving(false)
            return
        }

        if (result.revisionId) {
            router.push(`/admin/framvinda/${projectId}/revisions/${result.revisionId}`)
        } else {
            router.push(`/admin/framvinda/${projectId}`)
        }
    }

    return (
        <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Heiti viðbótar</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="t.d. Auka steypukerfa"
                        disabled={saving}
                    />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>

            <CardFooter className="border-t border-zinc-100 bg-zinc-50/50 p-6 flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/framvinda/${projectId}`)}
                    disabled={saving}
                >
                    Hætta við
                </Button>
                <Button
                    onClick={handleCreate}
                    disabled={saving || !name.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Stofna viðbót
                </Button>
            </CardFooter>
        </Card>
    )
}
