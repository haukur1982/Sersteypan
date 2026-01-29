'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteDiaryEntry } from '@/lib/diary/actions'

interface DiaryDeleteButtonProps {
    diaryId: string
}

export function DiaryDeleteButton({ diaryId }: DiaryDeleteButtonProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)

    const handleDelete = async () => {
        if (!showConfirm) {
            setShowConfirm(true)
            return
        }

        setIsDeleting(true)
        setError(null)

        try {
            const result = await deleteDiaryEntry(diaryId)

            if (result.error) {
                setError(result.error)
            } else {
                router.push('/factory/diary')
                router.refresh()
            }
        } catch (err) {
            setError('Villa kom upp við eyðingu')
            console.error(err)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-3">
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {!showConfirm ? (
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Eyða færslu
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Eyði...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Staðfesta eyðingu
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfirm(false)}
                        disabled={isDeleting}
                    >
                        Hætta við
                    </Button>
                </div>
            )}
        </div>
    )
}
