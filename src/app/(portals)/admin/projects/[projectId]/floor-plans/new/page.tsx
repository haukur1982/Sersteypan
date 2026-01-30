import { getUser } from '@/lib/auth/actions'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { FloorPlanUploadForm } from './FloorPlanUploadForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
    params: Promise<{ projectId: string }>
}

export default async function NewFloorPlanPage({ params }: Props) {
    const { projectId } = await params
    const user = await getUser()

    if (!user || user.role !== 'admin') {
        redirect('/login')
    }

    const supabase = await createClient()

    // Fetch project to verify it exists
    const { data: project, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single()

    if (error || !project) {
        return notFound()
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                <Link
                    href={`/admin/projects/${projectId}`}
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Til baka í verkefni
                </Link>

                <div>
                    <h1 className="text-2xl font-bold text-foreground">Ný hæðarteikning</h1>
                    <p className="text-muted-foreground mt-1">
                        Hlaða upp grunnmynd fyrir {project.name}
                    </p>
                </div>

                <FloorPlanUploadForm projectId={projectId} projectName={project.name} />
            </div>
        </DashboardLayout>
    )
}
