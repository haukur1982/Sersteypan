import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getElementsForProject } from '@/lib/elements/actions'
import { getProjectDocuments } from '@/lib/documents/actions'
import { getProjectBuildings } from '@/lib/drawing-analysis/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus,
    Pencil,
    Layers,
    Square,
    GalleryVerticalEnd,
    Box,
    Minus,
    CircleDot,
    HelpCircle,
    Map,
    Sparkles,
} from 'lucide-react'
import { DocumentUploadTabs } from '@/components/documents/DocumentUploadTabs'
import { DocumentListWithFilter } from '@/components/documents/DocumentListWithFilter'
import { ProjectActionButtons } from '@/components/admin/ProjectActionButtons'
import { ProjectElementsTableClient } from '@/components/admin/ProjectElementsTableClient'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectDocumentRow = Database['public']['Tables']['project_documents']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProjectDocumentWithProfile = ProjectDocumentRow & {
    profiles?: Pick<ProfileRow, 'full_name'> | null
}

// Element Type Configuration
const typeConfig = {
    wall: { color: 'bg-blue-100 text-blue-800', label: 'Veggur', icon: Square },
    filigran: { color: 'bg-purple-100 text-purple-800', label: 'Filigran', icon: Layers },
    staircase: { color: 'bg-orange-100 text-orange-800', label: 'Stigi', icon: GalleryVerticalEnd },
    balcony: { color: 'bg-green-100 text-green-800', label: 'Svalir', icon: Box },
    ceiling: { color: 'bg-zinc-100 text-zinc-800', label: 'Þak', icon: Minus },
    column: { color: 'bg-yellow-100 text-yellow-800', label: 'Súla', icon: CircleDot },
    beam: { color: 'bg-red-100 text-red-800', label: 'Bita', icon: Minus },
    other: { color: 'bg-zinc-100 text-zinc-600', label: 'Annað', icon: HelpCircle }
}

// Status Workflow Configuration
const statusConfig = {
    planned: { color: 'bg-zinc-100 text-zinc-600', label: 'Skipulagt' },
    rebar: { color: 'bg-yellow-100 text-yellow-800', label: 'Járnabundið' },
    cast: { color: 'bg-orange-100 text-orange-800', label: 'Steypt' },
    curing: { color: 'bg-amber-100 text-amber-800', label: 'Þornar' },
    ready: { color: 'bg-green-100 text-green-800', label: 'Tilbúið' },
    loaded: { color: 'bg-blue-100 text-blue-800', label: 'Á bíl' },
    delivered: { color: 'bg-purple-100 text-purple-800', label: 'Afhent' }
}

export default async function ProjectPage({
    params,
}: {
    params: Promise<{ projectId: string }>
}) {
    const { projectId } = await params

    // Fetch project data
    const { data: project, error } = await getProject(projectId)

    if (error || !project) {
        notFound()
    }

    // Fetch elements for this project
    const { data: elements, error: elementsError } = await getElementsForProject(projectId)
    const elementList = (elements ?? []) as ElementRow[]
    const elementIds = elementList.map((el) => el.id)

    // Fetch documents and buildings for this project
    const [documentsResult, buildings] = await Promise.all([
        getProjectDocuments(projectId),
        getProjectBuildings(projectId),
    ])
    const { data: documents, error: documentsError } = documentsResult
    const documentList = (documents ?? []) as ProjectDocumentWithProfile[]

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{project.name}</h1>
                    <p className="text-zinc-600 mt-1">{project.companies?.name}</p>
                </div>
                <div className="flex gap-2">
                    <ProjectActionButtons projectId={projectId} elementIds={elementIds} />
                    <Button variant="outline" asChild disabled={elementIds.length === 0}>
                        <Link href={`/admin/projects/${projectId}/qr-labels`}>
                            🖨️ Prenta QR Merki
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/admin/projects/${projectId}/floor-plans`}>
                            <Map className="mr-2 h-4 w-4" />
                            Hæðarteikningar
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/admin/projects/${projectId}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Breyta verkefni
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Project Details Card */}
            <Card className="bg-zinc-50/50 border-zinc-200">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-zinc-500">Staða</h3>
                            <p className="mt-1 font-medium capitalize">{project.status}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-zinc-500">Heimilisfang</h3>
                            <p className="mt-1">{project.address || '-'}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-zinc-500">Verkefnastjóri (Project Manager)</h3>
                            <p className="mt-1 text-zinc-400 text-sm italic">Not assigned</p>
                        </div>
                    </div>
                    {project.description && (
                        <div className="mt-6 pt-4 border-t border-zinc-200">
                            <h3 className="text-sm font-medium text-zinc-500">Lýsing</h3>
                            <p className="mt-1 text-zinc-700">{project.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Elements Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-zinc-900">
                        Einingar ({elementList.reduce((sum, el) => sum + (el.piece_count || 1), 0)}) (Elements)
                    </h2>
                    <div className="flex gap-2">
                        <Button asChild className="bg-purple-600 hover:bg-purple-700">
                            <Link href={`/admin/projects/${projectId}/analyze-drawings`}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Greina teikningar
                            </Link>
                        </Button>
                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link href={`/admin/projects/${projectId}/elements/new`}>
                                <Plus className="mr-2 h-4 w-4" />
                                Ný eining
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Error State for Elements */}
                {elementsError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja einingar:</p>
                        <p className="text-xs text-red-600 mt-1 font-mono">{elementsError}</p>
                    </div>
                )}

                <ProjectElementsTableClient elements={elementList} projectId={projectId} />
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-zinc-900">
                        Skjöl ({documentList.length}) (Documents)
                    </h2>
                </div>

                {documentsError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja skjöl:</p>
                        <p className="text-xs text-red-600 mt-1 font-mono">{documentsError}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload Form */}
                    <Card className="border-zinc-200">
                        <CardContent className="pt-6">
                            <DocumentUploadTabs
                                projectId={projectId}
                                elements={elementList.map(e => ({ id: e.id, name: e.name }))}
                                buildings={buildings}
                            />
                        </CardContent>
                    </Card>

                    {/* Documents List with Category Filter */}
                    <Card className="border-zinc-200">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold text-zinc-900 mb-4">Skjöl verkefnis</h3>
                            <DocumentListWithFilter documents={documentList} projectId={projectId} canDelete />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
