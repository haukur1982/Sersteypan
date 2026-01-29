import { getProject } from '@/lib/projects/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProjectForm } from '@/components/projects/ProjectForm'

interface EditProjectPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
    // Next.js 16: params is now a Promise and must be awaited
    const { projectId } = await params
    const { data: project, error } = await getProject(projectId)

    if (error || !project) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600">Villa</h1>
                    <p className="text-zinc-600">Ekki tókst að finna verkefni eða villa kom upp.</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Breyta verkefni</h1>
                    <p className="text-zinc-600 mt-2">Uppfæra upplýsingar um {project.name}</p>
                </div>

                <ProjectForm initialData={project} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
