'use client'

import { useState } from 'react'
import { createDiaryEntry } from '@/lib/diary/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Save } from 'lucide-react'

interface Project {
    id: string
    name: string
}

interface DiaryEntryFormProps {
    projects: Project[] | null
    today: string
}

export function DiaryEntryForm({ projects, today }: DiaryEntryFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setLoading(true)

        const formData = new FormData(event.currentTarget)

        try {
            const result = await createDiaryEntry(formData)

            if (result?.error) {
                setError(result.error)
                setLoading(false)
            }
            // If successful, the server action redirects, which throws NEXT_REDIRECT
        } catch (err: unknown) {
            // Check for Next.js redirect error
            const redirectError = err as { digest?: string } | null
            if (redirectError?.digest?.startsWith('NEXT_REDIRECT')) {
                // Let the redirect proceed
                throw err
            }

            console.error('Diary entry error:', err)
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Entry Date */}
            <div>
                <Label htmlFor="entry_date">
                    Dagsetning <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="entry_date"
                    name="entry_date"
                    type="date"
                    defaultValue={today}
                    required
                    className="mt-1.5"
                    disabled={loading}
                />
                <p className="text-sm text-zinc-500 mt-1">
                    Hvaða dag á færslan við
                </p>
            </div>

            {/* Project (optional) */}
            <div>
                <Label htmlFor="project_id">
                    Verkefni (valfrjálst)
                </Label>
                <Select name="project_id" disabled={loading}>
                    <SelectTrigger id="project_id" className="mt-1.5">
                        <SelectValue placeholder="Ekkert verkefni valið" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Ekkert verkefni</SelectItem>
                        {projects && projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                                {project.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-zinc-500 mt-1">
                    Tengja færsluna við ákveðið verkefni
                </p>
            </div>

            {/* Title (optional) */}
            <div>
                <Label htmlFor="title">
                    Titill (valfrjálst)
                </Label>
                <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="T.d. Góður dagur í framleiðslu"
                    className="mt-1.5"
                    disabled={loading}
                />
            </div>

            {/* Content */}
            <div>
                <Label htmlFor="content">
                    Innihald <span className="text-red-500">*</span>
                </Label>
                <Textarea
                    id="content"
                    name="content"
                    placeholder="Hvað gerðist í dag? Sérstakar athugasemdir, vandamál, árangur..."
                    required
                    rows={8}
                    className="mt-1.5"
                    disabled={loading}
                />
                <p className="text-sm text-zinc-500 mt-1">
                    Lýstu því sem gerðist í framleiðslunni í dag
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Vistar...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Vista færslu
                        </>
                    )}
                </Button>
                <Button type="button" variant="outline" asChild disabled={loading}>
                    <Link href="/factory/diary">
                        Hætta við
                    </Link>
                </Button>
            </div>
        </form>
    )
}
