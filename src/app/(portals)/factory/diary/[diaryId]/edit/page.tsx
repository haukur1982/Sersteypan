import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDiaryEntry, updateDiaryEntry } from '@/lib/diary/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { DiaryDeleteButton } from '@/components/factory/DiaryDeleteButton'
import type { Database } from '@/types/database'

type ProjectOption = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name'>

interface EditDiaryEntryPageProps {
    params: Promise<{
        diaryId: string
    }>
}

export default async function EditDiaryEntryPage({ params }: EditDiaryEntryPageProps) {
    const { diaryId } = await params
    const supabase = await createClient()

    // Fetch diary entry
    const { data: entry, error } = await getDiaryEntry(diaryId)

    if (error || !entry) {
        return notFound()
    }

    // Fetch all projects for optional project association
    const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name', { ascending: true })
    const projectList = (projects ?? []) as ProjectOption[]

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/factory/diary">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Breyta dagbókarfærslu (Edit Diary Entry)
                        </h1>
                        <p className="text-zinc-600 mt-1">
                            {new Date(entry.entry_date).toLocaleDateString('is-IS', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card className="border-zinc-200">
                    <CardHeader>
                        <CardTitle>Breyta færslu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={updateDiaryEntry.bind(null, diaryId)} className="space-y-6">
                            {/* Entry Date */}
                            <div>
                                <Label htmlFor="entry_date">
                                    Dagsetning <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="entry_date"
                                    name="entry_date"
                                    type="date"
                                    defaultValue={entry.entry_date}
                                    required
                                    className="mt-1.5"
                                />
                            </div>

                            {/* Project (optional) */}
                            <div>
                                <Label htmlFor="project_id">
                                    Verkefni (valfrjálst)
                                </Label>
                                <Select name="project_id" defaultValue={entry.project_id || ''}>
                                    <SelectTrigger id="project_id" className="mt-1.5">
                                        <SelectValue placeholder="Ekkert verkefni valið" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Ekkert verkefni</SelectItem>
                                        {projectList.map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    defaultValue={entry.title || ''}
                                    placeholder="T.d. Góður dagur í framleiðslu"
                                    className="mt-1.5"
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
                                    defaultValue={entry.content}
                                    placeholder="Hvað gerðist í dag? Sérstakar athugasemdir, vandamál, árangur..."
                                    required
                                    rows={8}
                                    className="mt-1.5"
                                />
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="flex-1 gap-2">
                                    <Save className="w-4 h-4" />
                                    Vista breytingar
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/factory/diary">
                                        Hætta við
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Delete Section */}
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700">Hættulegt svæði (Danger Zone)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-zinc-900">Eyða dagbókarfærslu</p>
                                <p className="text-sm text-zinc-600 mt-1">
                                    Þessi aðgerð er óafturkræf. Færslan verður varanlega eytt.
                                </p>
                            </div>
                            <DiaryDeleteButton diaryId={diaryId} />
                        </div>
                    </CardContent>
                </Card>

                {/* Entry Info */}
                <Card className="border-zinc-200 bg-zinc-50/50">
                    <CardContent className="pt-6">
                        <div className="text-sm text-zinc-600 space-y-1">
                            <p>
                                <span className="font-medium">Skráð af:</span> {entry.profiles?.full_name}
                            </p>
                            <p>
                                <span className="font-medium">Búið til:</span>{' '}
                                {new Date(entry.created_at).toLocaleString('is-IS')}
                            </p>
                            {entry.updated_at && entry.updated_at !== entry.created_at && (
                                <p>
                                    <span className="font-medium">Síðast uppfært:</span>{' '}
                                    {new Date(entry.updated_at).toLocaleString('is-IS')}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
