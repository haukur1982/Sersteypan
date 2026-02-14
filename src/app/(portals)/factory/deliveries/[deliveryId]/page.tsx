import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getFactoryDeliveryDetail } from '@/lib/factory/delivery-queries'
import type { DeliveryItem, OpenDefect } from '@/lib/factory/delivery-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    ArrowLeft,
    Truck,
    Calendar,
    MapPin,
    User,
    Package,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Phone,
} from 'lucide-react'

// -- Status configs --

const deliveryStatusConfig: Record<string, { label: string; color: string; icon: typeof Truck }> = {
    planned: { label: 'Skipulögð', color: 'bg-gray-100 text-gray-800', icon: Clock },
    loading: { label: 'Hleðsla', color: 'bg-blue-100 text-blue-800', icon: Package },
    in_transit: { label: 'Á leiðinni', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    arrived: { label: 'Á staðnum', color: 'bg-amber-100 text-amber-800', icon: MapPin },
    completed: { label: 'Lokið', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
}

const elementStatusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'Skipulagt', color: 'bg-zinc-100 text-zinc-600' },
    rebar: { label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { label: 'Á bíl', color: 'bg-blue-100 text-blue-800' },
    delivered: { label: 'Afhent', color: 'bg-purple-100 text-purple-800' },
}

// -- Timeline stages --

type TimelineStage = {
    key: string
    label: string
    icon: typeof Clock
    timestampField: 'created_at' | 'loading_started_at' | 'departed_at' | 'arrived_at' | 'completed_at'
}

const timelineStages: TimelineStage[] = [
    { key: 'planned', label: 'Skipulögð', icon: Calendar, timestampField: 'created_at' },
    { key: 'loading', label: 'Hleðsla', icon: Package, timestampField: 'loading_started_at' },
    { key: 'departed', label: 'Á leiðinni', icon: Truck, timestampField: 'departed_at' },
    { key: 'arrived', label: 'Á staðnum', icon: MapPin, timestampField: 'arrived_at' },
    { key: 'completed', label: 'Lokið', icon: CheckCircle2, timestampField: 'completed_at' },
]

// -- Helpers --

function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleString('is-IS', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatDimensions(el: { length_mm: number | null; width_mm: number | null; height_mm: number | null }): string {
    const parts: string[] = []
    if (el.length_mm != null) parts.push(`${el.length_mm}`)
    if (el.width_mm != null) parts.push(`${el.width_mm}`)
    if (el.height_mm != null) parts.push(`${el.height_mm}`)
    if (parts.length === 0) return '-'
    return parts.join(' x ') + ' mm'
}

function formatWeight(weight: number | null): string {
    if (weight == null) return '-'
    return `${weight.toLocaleString('is-IS')} kg`
}

// -- Page Component --

interface PageProps {
    params: Promise<{ deliveryId: string }>
}

export default async function FactoryDeliveryDetailPage({ params }: PageProps) {
    const { deliveryId } = await params
    const result = await getFactoryDeliveryDetail(deliveryId)

    if (!result) {
        notFound()
    }

    const delivery: NonNullable<typeof result> = result

    const statusInfo = deliveryStatusConfig[delivery.status || 'planned'] || deliveryStatusConfig.planned
    const StatusIcon = statusInfo.icon
    const project = delivery.project
    const driver = delivery.driver
    const items = delivery.delivery_items
    const defects = delivery.element_defects

    // Collect all elements with open defects
    const elementsWithDefects: { elementName: string; defects: OpenDefect[] }[] = []
    for (const item of items) {
        if (item.element && defects[item.element_id] && defects[item.element_id].length > 0) {
            elementsWithDefects.push({
                elementName: item.element.name,
                defects: defects[item.element_id],
            })
        }
    }

    // Determine which timeline stages are reached
    function getStageStatus(stage: TimelineStage): 'completed' | 'active' | 'pending' {
        const ts = delivery[stage.timestampField]
        if (ts) return 'completed'
        // Check if this is the next expected stage
        const stageIndex = timelineStages.indexOf(stage)
        const previousCompleted = stageIndex === 0 || delivery[timelineStages[stageIndex - 1].timestampField] != null
        if (previousCompleted && !ts) return 'active'
        return 'pending'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/factory/deliveries">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                Afhending
                            </h1>
                            <Badge variant="secondary" className={`${statusInfo.color} gap-1.5`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">
                            {delivery.planned_date
                                ? `Áætluð: ${formatDate(delivery.planned_date)}`
                                : 'Engin dagsetning áætluð'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Delivery Timeline */}
            <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-zinc-900">
                        Timalina afhendingar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2">
                        {timelineStages.map((stage, index) => {
                            const stageStatus = getStageStatus(stage)
                            const Icon = stage.icon
                            const timestamp = delivery[stage.timestampField]

                            return (
                                <div key={stage.key} className="flex flex-col items-center flex-1 min-w-[80px] relative">
                                    {/* Connector line */}
                                    {index > 0 && (
                                        <div
                                            className={`absolute top-4 -left-1/2 w-full h-0.5 ${
                                                stageStatus === 'completed'
                                                    ? 'bg-green-500'
                                                    : stageStatus === 'active'
                                                      ? 'bg-blue-300'
                                                      : 'bg-zinc-200'
                                            }`}
                                            style={{ zIndex: 0 }}
                                        />
                                    )}
                                    {/* Circle icon */}
                                    <div
                                        className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                            stageStatus === 'completed'
                                                ? 'bg-green-100 border-green-500 text-green-700'
                                                : stageStatus === 'active'
                                                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                  : 'bg-zinc-50 border-zinc-300 text-zinc-400'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    {/* Label */}
                                    <span
                                        className={`mt-2 text-xs font-medium text-center ${
                                            stageStatus === 'completed'
                                                ? 'text-green-700'
                                                : stageStatus === 'active'
                                                  ? 'text-blue-700'
                                                  : 'text-zinc-400'
                                        }`}
                                    >
                                        {stage.label}
                                    </span>
                                    {/* Timestamp */}
                                    {timestamp && (
                                        <span className="mt-0.5 text-[10px] text-zinc-500 text-center leading-tight">
                                            {formatDateTime(timestamp)}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Project + Driver info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project info */}
                <Card className="border-zinc-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-500" />
                            Verkefni
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {project ? (
                            <>
                                <div>
                                    <p className="text-sm font-medium text-zinc-900">{project.name}</p>
                                    {project.company && (
                                        <p className="text-sm text-zinc-500">{project.company.name}</p>
                                    )}
                                </div>
                                {project.address && (
                                    <p className="text-sm text-zinc-600">{project.address}</p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-zinc-400">Ekkert verkefni tengt</p>
                        )}
                    </CardContent>
                </Card>

                {/* Driver + Truck info */}
                <Card className="border-zinc-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-zinc-500" />
                            Bílstjóri og bíll
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {driver ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-900">{driver.full_name || 'Nafnlaus'}</p>
                                </div>
                                {driver.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-zinc-400" />
                                        <a
                                            href={`tel:${driver.phone}`}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            {driver.phone}
                                        </a>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-700">
                                <AlertTriangle className="w-4 h-4" />
                                <p className="text-sm font-medium">Enginn bílstjóri úthlutaður</p>
                            </div>
                        )}
                        {delivery.truck_registration && (
                            <div className="flex items-center gap-2 pt-1">
                                <Truck className="w-4 h-4 text-zinc-400" />
                                <p className="text-sm text-zinc-700">
                                    {delivery.truck_registration}
                                    {delivery.truck_description && (
                                        <span className="text-zinc-500"> &mdash; {delivery.truck_description}</span>
                                    )}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quality Warnings */}
            {elementsWithDefects.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Galla-viðvaranir ({elementsWithDefects.reduce((sum, e) => sum + e.defects.length, 0)})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {elementsWithDefects.map(({ elementName, defects: elementDefects }) => (
                                <div key={elementName} className="space-y-1">
                                    <p className="text-sm font-medium text-amber-900">{elementName}</p>
                                    {elementDefects.map((defect) => (
                                        <div
                                            key={defect.id}
                                            className="flex items-start gap-2 text-sm text-amber-800 pl-4"
                                        >
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <div>
                                                <span>{defect.issue_description}</span>
                                                <span className="ml-2 text-xs text-amber-600">
                                                    {defect.priority && `[${defect.priority}]`}
                                                    {defect.category && ` ${defect.category}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loaded Elements Table */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-zinc-500" />
                    Hlaðnar einingar ({items.length})
                </h2>

                {items.length > 0 ? (
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-50/80">
                                <TableRow>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Nafn
                                    </TableHead>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Tegund
                                    </TableHead>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Staða
                                    </TableHead>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Þyngd
                                    </TableHead>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Mál
                                    </TableHead>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Staðsetning
                                    </TableHead>
                                    <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                        Afhent
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: DeliveryItem) => {
                                    const el = item.element
                                    const elStatus = el
                                        ? elementStatusConfig[el.status || 'planned'] || elementStatusConfig.planned
                                        : elementStatusConfig.planned
                                    const hasDefects = el && defects[item.element_id] && defects[item.element_id].length > 0

                                    return (
                                        <TableRow key={item.id} className="hover:bg-zinc-50/50">
                                            <TableCell className="py-3 font-medium text-zinc-900">
                                                <div className="flex items-center gap-2">
                                                    {hasDefects && (
                                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                                    )}
                                                    {el?.name || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-zinc-600">
                                                {el?.element_type || '-'}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {el ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`${elStatus.color} border-0 font-medium text-xs`}
                                                    >
                                                        {elStatus.label}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-zinc-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-zinc-600 tabular-nums">
                                                {el ? formatWeight(el.weight_kg) : '-'}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-zinc-600 tabular-nums">
                                                {el
                                                    ? formatDimensions({
                                                          length_mm: el.length_mm,
                                                          width_mm: el.width_mm,
                                                          height_mm: el.height_mm,
                                                      })
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-zinc-600">
                                                {item.load_position || '-'}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-zinc-500">
                                                {item.delivered_at
                                                    ? formatDateTime(item.delivered_at)
                                                    : <span className="text-zinc-300">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <Card className="border-zinc-200 shadow-sm">
                        <CardContent className="py-12 text-center text-zinc-500">
                            Engar einingar hlaðnar
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Delivery Completion */}
            {delivery.status === 'completed' && (
                <Card className="border-green-200 bg-green-50/30 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-green-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Afhending lokið
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Received by */}
                            <div>
                                <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">
                                    Móttekið af
                                </p>
                                <p className="text-sm text-green-900">
                                    {delivery.received_by_name || 'Ekki skráð'}
                                </p>
                                {delivery.completed_at && (
                                    <p className="text-xs text-green-700 mt-1">
                                        {formatDateTime(delivery.completed_at)}
                                    </p>
                                )}
                            </div>

                            {/* Delivery photo */}
                            {delivery.delivery_photo_url && (
                                <div>
                                    <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-2">
                                        Mynd af afhendingu
                                    </p>
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-green-200">
                                        <Image
                                            src={delivery.delivery_photo_url}
                                            alt="Mynd af afhendingu"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Signature */}
                            {delivery.received_by_signature_url && (
                                <div>
                                    <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-2">
                                        Undirskrift
                                    </p>
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-green-200 bg-white">
                                        <Image
                                            src={delivery.received_by_signature_url}
                                            alt="Undirskrift móttakanda"
                                            fill
                                            className="object-contain"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            {delivery.notes && (
                <Card className="border-zinc-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-zinc-900">
                            Athugasemdir
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">{delivery.notes}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
