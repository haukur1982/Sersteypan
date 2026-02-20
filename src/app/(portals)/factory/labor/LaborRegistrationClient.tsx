'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'

interface Element {
    id: string
    name: string
    element_type: string
    status: string | null
    projects: { id: string, name: string } | null
}

interface Worker {
    id: string
    full_name: string | null
    role: string | null
}

export function LaborRegistrationClient({ elements, workers }: { elements: any[], workers: Worker[] }) {
    const router = useRouter()
    const { user } = useAuth()
    const [search, setSearch] = useState('')
    const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
    const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set())
    const [taskType, setTaskType] = useState('rebar') // Default task type
    const [submitting, setSubmitting] = useState(false)

    // Filter elements
    const filteredElements = elements.filter(el =>
        el.name.toLowerCase().includes(search.toLowerCase()) ||
        (el.projects?.name || '').toLowerCase().includes(search.toLowerCase())
    )

    const toggleElement = (id: string) => {
        const newSet = new Set(selectedElements)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedElements(newSet)
    }

    const toggleWorker = (id: string) => {
        const newSet = new Set(selectedWorkers)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedWorkers(newSet)
    }

    const handleSubmit = async () => {
        if (!user) return
        if (selectedElements.size === 0) {
            toast.error('Vinsamlegast veldu a.m.k eina einingu.')
            return
        }
        if (selectedWorkers.size === 0) {
            toast.error('Vinsamlegast veldu a.m.k einn starfsmann.')
            return
        }

        setSubmitting(true)

        try {
            const supabase = createClient()

            // 1. Insert into element_tasks for each selected element
            const tasksToInsert = Array.from(selectedElements).map(elId => ({
                element_id: elId,
                task_type: taskType,
                created_by: user.id
            }))

            const { data: insertedTasks, error: tasksError } = await supabase
                .from('element_tasks')
                .insert(tasksToInsert)
                .select('id')

            if (tasksError) throw tasksError
            if (!insertedTasks) throw new Error('Engin verkefni skráð')

            // 2. Insert workers for each newly created task
            const workerLinksToInsert: any[] = []
            insertedTasks.forEach(task => {
                Array.from(selectedWorkers).forEach(workerId => {
                    workerLinksToInsert.push({
                        task_id: task.id,
                        worker_id: workerId
                    })
                })
            })

            const { error: workersError } = await supabase
                .from('element_task_workers')
                .insert(workerLinksToInsert)

            if (workersError) throw workersError

            toast.success(`Tókst að skrá vinnu (${selectedWorkers.size} m. á ${selectedElements.size} einingum).`)

            setSelectedElements(new Set())
            setSelectedWorkers(new Set())

            // Optional: Auto refresh data
            setTimeout(() => {
                router.refresh()
            }, 1000)

        } catch (err: any) {
            console.error('Submit error:', err)
            toast.error(err.message || 'Villa við vistun.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Element Selection */}
            <div className="md:col-span-2 space-y-4">
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle>1. Veldu einingar</CardTitle>
                            <Badge variant="secondary">{selectedElements.size} valdar</Badge>
                        </div>
                        <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Leita að einingu eða verkefni..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-100 p-2">
                            {filteredElements.length === 0 ? (
                                <p className="p-4 text-center text-sm text-muted-foreground">Ekkert fannst</p>
                            ) : (
                                filteredElements.map(el => {
                                    const isSelected = selectedElements.has(el.id)
                                    return (
                                        <div
                                            key={el.id}
                                            onClick={() => toggleElement(el.id)}
                                            className={`p-3 cursor-pointer rounded-md transition-colors m-1 flex items-center gap-3 ${isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-zinc-50 border border-transparent'}`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-zinc-300'}`}>
                                                {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{el.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{el.projects?.name}</div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{el.status}</Badge>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Worker Selection & Submit */}
            <div className="space-y-4">
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle>2. Veldu starfsmenn</CardTitle>
                            <Badge variant="secondary">{selectedWorkers.size} valdir</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-100 p-2">
                            {workers.map(w => {
                                const isSelected = selectedWorkers.has(w.id)
                                return (
                                    <div
                                        key={w.id}
                                        onClick={() => toggleWorker(w.id)}
                                        className={`p-2 cursor-pointer rounded-md transition-colors m-1 flex items-center gap-2 ${isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-zinc-50 border border-transparent'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300'}`}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0 text-sm font-medium">
                                            {w.full_name || 'Ónefndur'}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-1">Verkþáttur</p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={taskType === 'rebar' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => setTaskType('rebar')}
                                >
                                    Járnabinding
                                </Button>
                                {/* Future: other tasks */}
                            </div>
                        </div>

                        <Button
                            className="w-full h-auto py-3 px-4 flex-col gap-1 items-center justify-center text-center whitespace-normal"
                            size="lg"
                            disabled={submitting || selectedElements.size === 0 || selectedWorkers.size === 0}
                            onClick={handleSubmit}
                        >
                            <span className="flex items-center text-base font-semibold">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Skrá vinnu
                            </span>
                            <span className="text-xs font-normal opacity-80">
                                {selectedElements.size} {selectedElements.size === 1 ? 'eining' : 'einingar'} á {selectedWorkers.size} {selectedWorkers.size === 1 ? 'mann' : 'menn'}
                            </span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
