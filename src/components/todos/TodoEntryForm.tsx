'use client'

import { useState } from 'react'
import { createTodoItem } from '@/lib/todos/actions'
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
import { AlertCircle, Loader2, Save } from 'lucide-react'
import Link from 'next/link'

interface Project {
    id: string
    name: string
}

interface TodoEntryFormProps {
    projects: Project[] | null
    today: string
}

export function TodoEntryForm({ projects, today }: TodoEntryFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setLoading(true)

        const formData = new FormData(event.currentTarget)

        try {
            const result = await createTodoItem(formData)

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

            console.error('Todo creation error:', err)
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
                <Label htmlFor="title">
                    Titill <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="T.d. Panta meira járn"
                    required
                    className="mt-1.5"
                    disabled={loading}
                />
            </div>

            {/* Description */}
            <div>
                <Label htmlFor="description">
                    Lýsing (valfrjálst)
                </Label>
                <Textarea
                    id="description"
                    name="description"
                    placeholder="Nánari lýsing á verkinu..."
                    rows={4}
                    className="mt-1.5"
                    disabled={loading}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Due Date */}
                <div>
                    <Label htmlFor="due_date">
                        Lokadagsetning (valfrjálst)
                    </Label>
                    <Input
                        id="due_date"
                        name="due_date"
                        type="date"
                        defaultValue={today}
                        className="mt-1.5"
                        disabled={loading}
                    />
                </div>

                {/* Priority */}
                <div>
                    <Label htmlFor="priority">
                        Forgangur
                    </Label>
                    <Select name="priority" defaultValue="0" disabled={loading}>
                        <SelectTrigger id="priority" className="mt-1.5">
                            <SelectValue placeholder="Veldu forgang" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Venjulegur</SelectItem>
                            <SelectItem value="1">Mikilvægur (1)</SelectItem>
                            <SelectItem value="2">Mjög mikilvægur (2)</SelectItem>
                            <SelectItem value="3">Hasteign (3)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
                    Tengja verkefnalistan við ákveðið verkefni
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
                            Vista verkefnalista
                        </>
                    )}
                </Button>
                <Button type="button" variant="outline" asChild disabled={loading}>
                    <Link href="/factory/todos">
                        Hætta við
                    </Link>
                </Button>
            </div>
        </form>
    )
}
