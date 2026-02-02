import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getElementsForProject } from '@/lib/elements/actions'
import { getProjectDocuments } from '@/lib/documents/actions'
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
    FileText,
    Download,
    Map
} from 'lucide-react'
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm'
import { ProjectActionButtons } from '@/components/admin/ProjectActionButtons'
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

interface ProjectPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { projectId } = await params

    console.log('--- DEBUG: Project Page ---')
    console.log('Params Project ID:', projectId)

    // Fetch project details
    const { data: project, error: projectError } = await getProject(projectId)
    console.log('Project Found:', !!project)
    if (projectError) console.error('Project Error:', projectError)

    if (projectError || !project) {
        return notFound()
    }

    // Fetch elements for this project
    const { data: elements, error: elementsError } = await getElementsForProject(projectId)
    const elementList = (elements ?? []) as ElementRow[]
    const elementIds = elementList.map((el) => el.id)

    // Fetch documents for this project
    const { data: documents, error: documentsError } = await getProjectDocuments(projectId)
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
                            Einingar ({elementList.length}) (Elements)
                        </h2>
                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link href={`/admin/projects/${projectId}/elements/new`}>
                                <Plus className="mr-2 h-4 w-4" />
                                Ný eining
                            </Link>
                        </Button>
                    </div>

                    {/* Error State for Elements */}
                    {elementsError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja einingar:</p>
                            <p className="text-xs text-red-600 mt-1 font-mono">{elementsError}</p>
                        </div>
                    )}

                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-50">
                                <TableRow>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">Nafn (Name)</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">Tegund (Type)</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">Staða (Status)</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[100px]">Forgangur</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[100px]">Hæð</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[140px]">QR</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">Aðgerðir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {elementList.length > 0 ? (
                                    elementList.map((element) => {
                                        const typeInfo = typeConfig[element.element_type as keyof typeof typeConfig] || typeConfig.other
                                        const statusInfo = statusConfig[element.status as keyof typeof statusConfig] || statusConfig.planned
                                        const TypeIcon = typeInfo.icon

                                        return (
                                            <TableRow key={element.id} className="hover:bg-zinc-50">
                                                <TableCell className="font-semibold text-zinc-900 py-4">
                                                    {element.name}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant="secondary" className={`${typeInfo.color} gap-1 border-0 font-normal`}>
                                                        <TypeIcon className="h-3 w-3" />
                                                        {typeInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant="secondary" className={`${statusInfo.color} border-0 font-medium`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4 text-zinc-600">
                                                    {(element.priority ?? 0) > 0 ? (
                                                        <span className="font-medium text-orange-600">{element.priority}</span>
                                                    ) : (
                                                        <span className="text-zinc-400">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-zinc-600">
                                                    {element.floor || '-'}
                                                </TableCell>
                                                <TableCell className="py-4 text-zinc-600">
                                                    {element.qr_code_url ? (
                                                        <a
                                                            href={element.qr_code_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline text-sm"
                                                        >
                                                            View QR
                                                        </a>
                                                    ) : (
                                                        <span className="text-zinc-400">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                        <Link href={`/admin/elements/${element.id}/edit`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                            Engar einingar skráðar (No elements found).
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
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
                                <h3 className="font-semibold text-zinc-900 mb-4">Hlaða upp skjali</h3>
                                <DocumentUploadForm projectId={projectId} />
                            </CardContent>
                        </Card>

                        {/* Documents List */}
                        <Card className="border-zinc-200">
                            <CardContent className="pt-6">
                                <h3 className="font-semibold text-zinc-900 mb-4">Skjöl verkefnis</h3>
                                {documentList.length > 0 ? (
                                    <div className="space-y-3">
                                        {documentList.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center justify-between p-3 border border-zinc-200 rounded-md hover:bg-zinc-50"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <FileText className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-zinc-900 truncate">
                                                            {doc.name}
                                                        </p>
                                                        {doc.description && (
                                                            <p className="text-xs text-zinc-500 truncate">
                                                                {doc.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-zinc-400">
                                                            {doc.profiles?.full_name} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString('is-IS') : 'Óþekkt'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                        className="h-8 w-8 text-zinc-500 hover:text-blue-600"
                                                    >
                                                        <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500 text-center py-8">
                                        Engin skjöl hafa verið hlaðið upp ennþá.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
    )
}
