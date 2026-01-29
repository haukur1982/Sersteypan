import { getProject } from '@/lib/projects/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ElementForm } from '@/components/elements/ElementForm'

interface NewElementPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default async function NewElementPage({ params }: NewElementPageProps) {
    const { projectId } = await params

    // Optionally fetch project name for display
    const { data: project } = await getProject(projectId)

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Ný eining</h1>
                    <p className="text-zinc-600 mt-2">
                        Stofna nýja einingu fyrir {project?.name || 'verkefnið'} (Create new element)
                    </p>
                </div>

                <ElementForm isEditing={false} preselectedProjectId={projectId} />
            </div>
        </DashboardLayout>
    )
}
