import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProjectForm } from '@/components/projects/ProjectForm'

export default function NewProjectPage() {
    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Nýtt verkefni</h1>
                    <p className="text-zinc-600 mt-2">Skrá nýtt verkefni (Register new project)</p>
                </div>

                <ProjectForm isEditing={false} />
            </div>
        </DashboardLayout>
    )
}
