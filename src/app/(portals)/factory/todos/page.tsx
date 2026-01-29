import { getTodoItems } from '@/lib/todos/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, CheckSquare, ArrowLeft, Calendar, Pencil } from 'lucide-react'
import { TodoCheckbox } from '@/components/factory/TodoCheckbox'
import type { Database } from '@/types/database'

type TodoRow = Database['public']['Tables']['todo_items']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type TodoItem = Pick<TodoRow, 'id' | 'title' | 'description' | 'due_date' | 'priority' | 'is_completed' | 'completed_at' | 'created_at' | 'updated_at'> & {
    projects?: Pick<ProjectRow, 'name'> | null
}

export default async function TodosPage() {
    const { data: todos, error } = await getTodoItems()
    const todoList = (todos ?? []) as TodoItem[]

    // Separate completed and pending todos
    const pendingTodos = todoList.filter((todo) => !todo.is_completed)
    const completedTodos = todoList.filter((todo) => todo.is_completed)

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/factory">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                                Verkefnalisti (Todo List)
                            </h1>
                            <p className="text-zinc-600 mt-1">
                                {pendingTodos.length} opin verkefni
                            </p>
                        </div>
                    </div>
                    <Button asChild className="gap-2">
                        <Link href="/factory/todos/new">
                            <Plus className="w-4 h-4" />
                            Nýtt verkefni
                        </Link>
                    </Button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja verkefnalista:</p>
                        <p className="text-xs text-red-600 mt-1 font-mono">{error}</p>
                    </div>
                )}

                {/* Pending Todos */}
                {pendingTodos.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-3">
                            Opin verkefni ({pendingTodos.length})
                        </h2>
                        <div className="space-y-2">
                            {pendingTodos.map((todo) => (
                                <Card key={todo.id} className="border-zinc-200 hover:shadow-sm transition-shadow">
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <div className="flex-shrink-0 pt-0.5">
                                                <TodoCheckbox
                                                    todoId={todo.id}
                                                    isCompleted={todo.is_completed}
                                                />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-base font-semibold text-zinc-900">
                                                            {todo.title}
                                                        </h3>
                                                        {todo.description && (
                                                            <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">
                                                                {todo.description}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                                            {todo.due_date && (
                                                                <Badge variant="secondary" className="gap-1 text-xs">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {new Date(todo.due_date).toLocaleDateString('is-IS')}
                                                                </Badge>
                                                            )}
                                                            {todo.priority > 0 && (
                                                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                                                    Forgangur {todo.priority}
                                                                </Badge>
                                                            )}
                                                            {todo.projects && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {todo.projects.name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Edit button */}
                                                    <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                                                        <Link href={`/factory/todos/${todo.id}/edit`}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed Todos */}
                {completedTodos.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-3">
                            Lokið ({completedTodos.length})
                        </h2>
                        <div className="space-y-2">
                            {completedTodos.map((todo) => (
                                <Card key={todo.id} className="border-zinc-200 bg-zinc-50/50">
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <div className="flex-shrink-0 pt-0.5">
                                                <TodoCheckbox
                                                    todoId={todo.id}
                                                    isCompleted={todo.is_completed}
                                                />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-base font-medium text-zinc-500 line-through">
                                                            {todo.title}
                                                        </h3>
                                                        {todo.description && (
                                                            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                                                                {todo.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-zinc-500 mt-2">
                                                            Lokið: {new Date(todo.completed_at).toLocaleDateString('is-IS')}
                                                        </p>
                                                    </div>

                                                    {/* Edit button */}
                                                    <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                                                        <Link href={`/factory/todos/${todo.id}/edit`}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!error && pendingTodos.length === 0 && completedTodos.length === 0 && (
                    <Card className="border-zinc-200">
                        <CardContent className="pt-6">
                            <div className="text-center py-12">
                                <CheckSquare className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                                <p className="text-zinc-600 font-medium">Enginn verkefnalisti</p>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Byrjaðu að skipuleggja vinnuna þína
                                </p>
                                <Button asChild className="mt-4 gap-2">
                                    <Link href="/factory/todos/new">
                                        <Plus className="w-4 h-4" />
                                        Nýtt verkefni
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}
