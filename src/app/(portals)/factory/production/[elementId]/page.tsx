import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    ArrowLeft,
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    Building,
    Box,
    Image as ImageIcon
} from 'lucide-react'
import { ElementStatusUpdateForm } from '@/components/factory/ElementStatusUpdateForm'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import type { ElementPhoto } from '@/components/buyer/project/types'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']
type ElementEventRow = Database['public']['Tables']['element_events']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

type ElementDetail = Pick<
    ElementRow,
    | 'id'
    | 'name'
    | 'element_type'
    | 'status'
    | 'priority'
    | 'floor'
    | 'position_description'
    | 'length_mm'
    | 'width_mm'
    | 'height_mm'
    | 'weight_kg'
    | 'drawing_reference'
    | 'batch_number'
    | 'production_notes'
    | 'created_at'
    | 'updated_at'
    | 'rebar_completed_at'
    | 'cast_at'
    | 'curing_completed_at'
    | 'ready_at'
    | 'loaded_at'
    | 'delivered_at'
> & {
    projects?: (Pick<ProjectRow, 'id' | 'name' | 'address'> & {
        companies?: Pick<CompanyRow, 'name'> | null
    }) | null
}

type ElementEvent = Pick<ElementEventRow, 'id' | 'status' | 'previous_status' | 'notes' | 'created_at' | 'created_by'> & {
    profiles?: Pick<ProfileRow, 'full_name'> | null
}

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' }
}

const typeConfig = {
    wall: { label: 'Veggur' },
    filigran: { label: 'Filigran' },
    staircase: { label: 'Stigi' },
    balcony: { label: 'Svalir' },
    ceiling: { label: 'Þak' },
    column: { label: 'Súla' },
    beam: { label: 'Bita' },
    other: { label: 'Annað' }
}

interface ElementUpdatePageProps {
    params: Promise<{
        elementId: string
    }>
}

export default async function ElementUpdatePage({ params }: ElementUpdatePageProps) {
    const { elementId } = await params
    const supabase = await createClient()

    // Fetch element details
    const { data: element, error } = await supabase
        .from('elements')
        .select(`
            id,
            name,
            element_type,
            status,
            priority,
            floor,
            position_description,
            length_mm,
            width_mm,
            height_mm,
            weight_kg,
            drawing_reference,
            batch_number,
            production_notes,
            created_at,
            updated_at,
            rebar_completed_at,
            cast_at,
            curing_completed_at,
            ready_at,
            loaded_at,
            delivered_at,
            projects (
                id,
                name,
                address,
                companies (
                    name
                )
            )
        `)
        .eq('id', elementId)
        .single()

    if (error || !element) {
        return notFound()
    }
    const elementDetail = element as ElementDetail

    // Fetch status history
    const { data: history } = await supabase
        .from('element_events')
        .select(`
            id,
            status,
            previous_status,
            notes,
            created_at,
            created_by,
            profiles (
                full_name
            )
        `)
        .eq('element_id', elementId)
        .order('created_at', { ascending: false })
        .limit(10)
    const historyList = (history ?? []) as ElementEvent[]

    // Fetch element photos
    const { data: photos } = await supabase
        .from('element_photos')
        .select(`
            *,
            created_by:profiles!element_photos_taken_by_fkey (
                full_name
            )
        `)
        .eq('element_id', elementId)
        .order('created_at', { ascending: false })
    const photoList = (photos ?? []) as ElementPhoto[]

    const statusInfo = statusConfig[elementDetail.status as keyof typeof statusConfig] || statusConfig.planned
    const typeInfo = typeConfig[elementDetail.element_type as keyof typeof typeConfig] || typeConfig.other
    const StatusIcon = statusInfo.icon

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header with back button */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/factory/production">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            {elementDetail.name}
                        </h1>
                        <p className="text-zinc-600 mt-1">
                            Uppfæra framleiðslustöðu (Update Production Status)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Element Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Current Status Card */}
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Núverandi staða (Current Status)</span>
                                    <Badge variant="secondary" className={`${statusInfo.color} gap-1`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {statusInfo.label}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ElementStatusUpdateForm element={elementDetail} />
                            </CardContent>
                        </Card>

                        {/* Element Details */}
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Box className="w-5 h-5" />
                                    Upplýsingar um einingu (Element Details)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Tegund</p>
                                        <p className="mt-1 text-zinc-900">{typeInfo.label}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Forgangur</p>
                                        <p className="mt-1 text-zinc-900">
                                            {(elementDetail.priority ?? 0) > 0 ? (
                                                <span className="font-bold text-orange-600">{elementDetail.priority}</span>
                                            ) : (
                                                <span className="text-zinc-400">0</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Hæð (Floor)</p>
                                        <p className="mt-1 text-zinc-900">{elementDetail.floor || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Batch númer</p>
                                        <p className="mt-1 text-zinc-900 font-mono text-sm">{elementDetail.batch_number || '-'}</p>
                                    </div>
                                </div>

                                {elementDetail.position_description && (
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Staðsetning</p>
                                        <p className="mt-1 text-zinc-900">{elementDetail.position_description}</p>
                                    </div>
                                )}

                                {elementDetail.drawing_reference && (
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Teikning</p>
                                        <p className="mt-1 text-zinc-900">{elementDetail.drawing_reference}</p>
                                    </div>
                                )}

                                {(elementDetail.length_mm || elementDetail.width_mm || elementDetail.height_mm || elementDetail.weight_kg) && (
                                    <div className="pt-4 border-t border-zinc-200">
                                        <p className="text-sm font-medium text-zinc-500 mb-3">Mál og þyngd</p>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {elementDetail.length_mm && (
                                                <div>
                                                    <span className="text-zinc-600">Lengd:</span>{' '}
                                                    <span className="font-medium text-zinc-900">{elementDetail.length_mm} mm</span>
                                                </div>
                                            )}
                                            {elementDetail.width_mm && (
                                                <div>
                                                    <span className="text-zinc-600">Breidd:</span>{' '}
                                                    <span className="font-medium text-zinc-900">{elementDetail.width_mm} mm</span>
                                                </div>
                                            )}
                                            {elementDetail.height_mm && (
                                                <div>
                                                    <span className="text-zinc-600">Hæð:</span>{' '}
                                                    <span className="font-medium text-zinc-900">{elementDetail.height_mm} mm</span>
                                                </div>
                                            )}
                                            {elementDetail.weight_kg && (
                                                <div>
                                                    <span className="text-zinc-600">Þyngd:</span>{' '}
                                                    <span className="font-medium text-zinc-900">{elementDetail.weight_kg} kg</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {elementDetail.production_notes && (
                                    <div className="pt-4 border-t border-zinc-200">
                                        <p className="text-sm font-medium text-zinc-500">Athugasemdir</p>
                                        <p className="mt-1 text-sm text-zinc-700">{elementDetail.production_notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Status History */}
                        {historyList.length > 0 && (
                            <Card className="border-zinc-200">
                                <CardHeader>
                                    <CardTitle>Stöðuferill (Status History)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {historyList.map((event) => {
                                            const eventStatusInfo = statusConfig[event.status as keyof typeof statusConfig]
                                            const EventIcon = eventStatusInfo?.icon || Clock

                                            return (
                                                <div key={event.id} className="flex gap-3 pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                                                    <div className="flex-shrink-0 mt-1">
                                                        <div className={`p-2 rounded-full ${eventStatusInfo?.color || 'bg-zinc-100'}`}>
                                                            <EventIcon className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant="secondary" className={`${eventStatusInfo?.color || 'bg-zinc-100'} text-xs`}>
                                                                {eventStatusInfo?.label || event.status}
                                                            </Badge>
                                                            <span className="text-xs text-zinc-500">
                                                                {event.created_at ? new Date(event.created_at).toLocaleString('is-IS') : '-'}
                                                            </span>
                                                        </div>
                                                        {event.profiles?.full_name && (
                                                            <p className="text-sm text-zinc-600 mt-1">
                                                                {event.profiles.full_name}
                                                            </p>
                                                        )}
                                                        {event.notes && (
                                                            <p className="text-sm text-zinc-700 mt-1">{event.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Photo Gallery */}
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 flex-shrink-0" />
                                    Myndasafn (Photo Gallery)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <PhotoGallery photos={photoList} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Project Info */}
                    <div className="space-y-6">
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building className="w-5 h-5" />
                                    Verkefni (Project)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500">Nafn</p>
                                    <p className="mt-1 text-zinc-900 font-semibold">{elementDetail.projects?.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-500">Fyrirtæki</p>
                                    <p className="mt-1 text-zinc-900">{elementDetail.projects?.companies?.name}</p>
                                </div>
                                {elementDetail.projects?.address && (
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Heimilisfang</p>
                                        <p className="mt-1 text-sm text-zinc-700">{elementDetail.projects.address}</p>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-zinc-200">
                                    <Button asChild variant="outline" className="w-full" size="sm">
                                        <Link href={`/factory/projects/${elementDetail.projects?.id}`}>
                                            Sjá verkefni
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Timestamps */}
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle className="text-lg">Dagsetningar (Timestamps)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {elementDetail.rebar_completed_at && (
                                    <div>
                                        <p className="text-zinc-500">Járnabundið</p>
                                        <p className="text-zinc-900 font-medium">
                                            {new Date(elementDetail.rebar_completed_at).toLocaleString('is-IS')}
                                        </p>
                                    </div>
                                )}
                                {elementDetail.cast_at && (
                                    <div>
                                        <p className="text-zinc-500">Steypt</p>
                                        <p className="text-zinc-900 font-medium">
                                            {new Date(elementDetail.cast_at).toLocaleString('is-IS')}
                                        </p>
                                    </div>
                                )}
                                {elementDetail.curing_completed_at && (
                                    <div>
                                        <p className="text-zinc-500">Þurrkun lokið</p>
                                        <p className="text-zinc-900 font-medium">
                                            {new Date(elementDetail.curing_completed_at).toLocaleString('is-IS')}
                                        </p>
                                    </div>
                                )}
                                {elementDetail.ready_at && (
                                    <div>
                                        <p className="text-zinc-500">Tilbúið</p>
                                        <p className="text-zinc-900 font-medium">
                                            {new Date(elementDetail.ready_at).toLocaleString('is-IS')}
                                        </p>
                                    </div>
                                )}
                                {!elementDetail.rebar_completed_at && !elementDetail.cast_at && !elementDetail.curing_completed_at && !elementDetail.ready_at && (
                                    <p className="text-zinc-500 text-center py-4">
                                        Engar tímastimplar enn
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
        </div>
    )
}
