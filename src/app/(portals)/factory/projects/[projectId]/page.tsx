import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getElementsForProject } from '@/lib/elements/actions'
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
    Layers,
    Square,
    GalleryVerticalEnd,
    Box,
    Minus,
    CircleDot,
    HelpCircle,
    ArrowLeft,
    Pencil
} from 'lucide-react'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']

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

export default async function FactoryProjectPage({ params }: ProjectPageProps) {
    const { projectId } = await params

    // Fetch project details
    const { data: project, error: projectError } = await getProject(projectId)

    if (projectError || !project) {
        return notFound()
    }

    // Fetch elements for this project
    const { data: elements, error: elementsError } = await getElementsForProject(projectId)
    const elementList = (elements ?? []) as ElementRow[]

    return (
        <div className="space-y-8">
                {/* Header Section */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/factory/production">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
                            <p className="text-muted-foreground mt-1">{project.companies?.name}</p>
                        </div>
                    </div>
                </div>

                {/* Project Details Card */}
                <Card className="bg-muted/50 border-border">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Staða</h3>
                                <p className="mt-1 font-medium capitalize">{project.status}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Heimilisfang</h3>
                                <p className="mt-1">{project.address || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Start Date</h3>
                                <p className="mt-1 text-foreground">
                                    {project.start_date ? new Date(project.start_date).toLocaleDateString('is-IS') : '-'}
                                </p>
                            </div>
                        </div>
                        {project.description && (
                            <div className="mt-6 pt-4 border-t border-border">
                                <h3 className="text-sm font-medium text-muted-foreground">Lýsing</h3>
                                <p className="mt-1 text-muted-foreground">{project.description}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Elements Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-foreground">
                            Einingar ({elementList.length}) (Elements)
                        </h2>
                    </div>

                    {/* Error State for Elements */}
                    {elementsError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja einingar:</p>
                            <p className="text-xs text-red-600 mt-1 font-mono">{elementsError}</p>
                        </div>
                    )}

                    <Card className="border-border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Nafn (Name)</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Tegund (Type)</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Staða (Status)</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider w-[100px]">Forgangur</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider w-[100px]">Hæð</TableHead>
                                    <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider text-right">Aðgerðir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {elementList.length > 0 ? (
                                    elementList.map((element) => {
                                        const typeInfo = typeConfig[element.element_type as keyof typeof typeConfig] || typeConfig.other
                                        const statusInfo = statusConfig[element.status as keyof typeof statusConfig] || statusConfig.planned
                                        const TypeIcon = typeInfo.icon

                                        return (
                                            <TableRow key={element.id} className="hover:bg-muted/50">
                                                <TableCell className="font-semibold text-foreground py-4">
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
                                                <TableCell className="py-4 text-muted-foreground">
                                                    {(element.priority ?? 0) > 0 ? (
                                                        <span className="font-medium text-orange-600">{element.priority}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground/50">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-muted-foreground">
                                                    {element.floor || '-'}
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-blue-600">
                                                        <Link href={`/factory/production/${element.id}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Engar einingar skráðar (No elements found).
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
        </div>
    )
}
