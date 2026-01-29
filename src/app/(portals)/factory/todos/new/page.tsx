import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TodoEntryForm } from '@/components/todos/TodoEntryForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewTodoPage() {
    const supabase = await createClient()

    // Fetch all projects for optional project association
    const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name', { ascending: true })

    // Get today's date for default
    const today = new Date().toISOString().split('T')[0]

    return (
        <DashboardLayout>
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
                            Nýtt verkefni (New Todo)
                        </h1>
                        <p className="text-zinc-600 mt-1">
                            Bættu nýju verkefni á listann þinn
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card className="border-zinc-200">
                    <CardHeader>
                        <CardTitle>Nýtt verkefni</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TodoEntryForm
                            projects={projects || []}
                            today={today}
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
