import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodoItem, updateTodoItem } from '@/lib/todos/actions'
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
import { TodoDeleteButton } from '@/components/factory/TodoDeleteButton'
import type { Database } from '@/types/database'

type ProjectOption = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name'>

interface EditTodoPageProps {
    params: Promise<{
        todoId: string
    }>
}

export default async function EditTodoPage({ params }: EditTodoPageProps) {
    const { todoId } = await params
    const supabase = await createClient()

    // Fetch todo item
    const { data: todo, error } = await getTodoItem(todoId)

    if (error || !todo) {
        return notFound()
    }

    // Fetch all projects for optional project association
    const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name', { ascending: true })
    const projectList = (projects ?? []) as ProjectOption[]

    async function handleUpdate(formData: FormData) {
        'use server'
        await updateTodoItem(todoId, formData)
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/factory/todos">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Breyta verkefni (Edit Todo)
                        </h1>
                        <p className="text-zinc-600 mt-1">
                            {todo.title}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card className="border-zinc-200">
                    <CardHeader>
                        <CardTitle>Breyta verkefni</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={handleUpdate} className="space-y-6">
                            {/* Title */}
                            <div>
                                <Label htmlFor="title">
                                    Titill <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    name="title"
                                    type="text"
                                    defaultValue={todo.title}
                                    placeholder="T.d. Athuga járnabindingar fyrir V-13"
                                    required
                                    className="mt-1.5"
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
                                    defaultValue={todo.description || ''}
                                    placeholder="Nánari lýsing á verkefninu..."
                                    rows={4}
                                    className="mt-1.5"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Due Date */}
                                <div>
                                    <Label htmlFor="due_date">
                                        Skiladagur (valfrjálst)
                                    </Label>
                                    <Input
                                        id="due_date"
                                        name="due_date"
                                        type="date"
                                        defaultValue={todo.due_date || ''}
                                        className="mt-1.5"
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <Label htmlFor="priority">
                                        Forgangur (0-10)
                                    </Label>
                                    <Input
                                        id="priority"
                                        name="priority"
                                        type="number"
                                        min="0"
                                        max="10"
                                        defaultValue={todo.priority || 0}
                                        className="mt-1.5"
                                    />
                                    <p className="text-sm text-zinc-500 mt-1">
                                        0 = venjulegur, 10 = hæstur
                                    </p>
                                </div>
                            </div>

                            {/* Project (optional) */}
                            <div>
                                <Label htmlFor="project_id">
                                    Verkefni (valfrjálst)
                                </Label>
                                <Select name="project_id" defaultValue={todo.project_id || ''}>
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

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="flex-1 gap-2">
                                    <Save className="w-4 h-4" />
                                    Vista breytingar
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/factory/todos">
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
                                <p className="font-medium text-zinc-900">Eyða verkefni</p>
                                <p className="text-sm text-zinc-600 mt-1">
                                    Þessi aðgerð er óafturkræf. Verkefnið verður varanlega eytt.
                                </p>
                            </div>
                            <TodoDeleteButton todoId={todoId} />
                        </div>
                    </CardContent>
                </Card>

                {/* Todo Info */}
                <Card className="border-zinc-200 bg-zinc-50/50">
                    <CardContent className="pt-6">
                        <div className="text-sm text-zinc-600 space-y-1">
                            <p>
                                <span className="font-medium">Búið til:</span>{' '}
                                {todo.created_at
                                    ? new Date(todo.created_at).toLocaleString('is-IS')
                                    : 'Óþekkt'}
                            </p>
                            {todo.updated_at && todo.updated_at !== todo.created_at && (
                                <p>
                                    <span className="font-medium">Síðast uppfært:</span>{' '}
                                    {new Date(todo.updated_at).toLocaleString('is-IS')}
                                </p>
                            )}
                            {todo.is_completed === true && todo.completed_at && (
                                <p>
                                    <span className="font-medium">Lokið:</span>{' '}
                                    {new Date(todo.completed_at).toLocaleString('is-IS')}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
        </div>
    )
}
