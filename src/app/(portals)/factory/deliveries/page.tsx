import { getFactoryDeliveries } from '@/lib/factory/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
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
    ArrowRight,
} from 'lucide-react'

const deliveryStatusConfig: Record<string, { label: string; color: string; icon: typeof Truck }> = {
    planned: { label: 'Skipulögð', color: 'bg-gray-100 text-gray-800', icon: Clock },
    loading: { label: 'Hleðsla', color: 'bg-blue-100 text-blue-800', icon: Package },
    in_transit: { label: 'Á leiðinni', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    arrived: { label: 'Á staðnum', color: 'bg-amber-100 text-amber-800', icon: MapPin },
    completed: { label: 'Lokið', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
}

export default async function FactoryDeliveriesPage() {
    const deliveries = await getFactoryDeliveries()

    // Group deliveries by date
    const grouped: Record<string, typeof deliveries> = {}
    const noDate: typeof deliveries = []

    for (const d of deliveries) {
        if (d.planned_date) {
            const dateKey = d.planned_date.slice(0, 10) // YYYY-MM-DD
            if (!grouped[dateKey]) grouped[dateKey] = []
            grouped[dateKey].push(d)
        } else {
            noDate.push(d)
        }
    }

    // Sort date keys ascending
    const sortedDates = Object.keys(grouped).sort()

    // Separate into past, today, future
    const today = new Date().toISOString().slice(0, 10)
    const pastDates = sortedDates.filter(d => d < today)
    const todayDeliveries = grouped[today] || []
    const futureDates = sortedDates.filter(d => d > today)

    // Stats
    const totalDeliveries = deliveries.length
    const unassigned = deliveries.filter(d => !d.driver).length
    const activeToday = todayDeliveries.length
    const upcoming = futureDates.reduce((sum, d) => sum + (grouped[d]?.length || 0), 0)

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00')
        return d.toLocaleDateString('is-IS', { weekday: 'long', day: 'numeric', month: 'long' })
    }

    const formatDateShort = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00')
        return d.toLocaleDateString('is-IS', { weekday: 'short', day: 'numeric', month: 'short' })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/factory">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Afhendingar (Deliveries)
                        </h1>
                    </div>
                    <p className="ml-12 text-sm text-zinc-600">
                        {totalDeliveries} afhendingar samtals
                    </p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">{activeToday}</p>
                                <p className="text-xs text-zinc-500">Í dag</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <ArrowRight className="w-5 h-5 text-indigo-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">{upcoming}</p>
                                <p className="text-xs text-zinc-500">Væntanlegar</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                                    {deliveries.filter(d => d.status === 'completed').length}
                                </p>
                                <p className="text-xs text-zinc-500">Lokið</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {unassigned > 0 && (
                    <Card className="border-amber-200 bg-amber-50/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <div>
                                    <p className="text-2xl font-bold text-amber-900 tabular-nums">{unassigned}</p>
                                    <p className="text-xs text-amber-700">Án bílstjóra</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Today's deliveries */}
            {todayDeliveries.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Í dag — {formatDate(today)}
                    </h2>
                    <div className="space-y-3">
                        {todayDeliveries.map((delivery) => (
                            <DeliveryCard key={delivery.id} delivery={delivery} />
                        ))}
                    </div>
                </div>
            )}

            {/* Future deliveries */}
            {futureDates.map((date) => (
                <div key={date}>
                    <h2 className="text-lg font-semibold text-zinc-900 mb-3">
                        {formatDate(date)}
                    </h2>
                    <div className="space-y-3">
                        {grouped[date].map((delivery) => (
                            <DeliveryCard key={delivery.id} delivery={delivery} />
                        ))}
                    </div>
                </div>
            ))}

            {/* Past deliveries (collapsed) */}
            {pastDates.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 py-2">
                        Liðnar afhendingar ({pastDates.reduce((sum, d) => sum + (grouped[d]?.length || 0), 0)})
                    </summary>
                    <div className="mt-3 space-y-6">
                        {pastDates.reverse().map((date) => (
                            <div key={date}>
                                <h3 className="text-sm font-medium text-zinc-600 mb-2">
                                    {formatDateShort(date)}
                                </h3>
                                <div className="space-y-2">
                                    {grouped[date].map((delivery) => (
                                        <DeliveryCard key={delivery.id} delivery={delivery} compact />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Unscheduled deliveries */}
            {noDate.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Án dagsetningar ({noDate.length})
                    </h2>
                    <div className="space-y-3">
                        {noDate.map((delivery) => (
                            <DeliveryCard key={delivery.id} delivery={delivery} />
                        ))}
                    </div>
                </div>
            )}

            {deliveries.length === 0 && (
                <Card className="border-zinc-200">
                    <CardContent className="py-16 text-center text-zinc-500">
                        Engar afhendingar skráðar
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function DeliveryCard({ delivery, compact }: {
    delivery: {
        id: string
        status: string | null
        planned_date: string | null
        truck_registration: string | null
        project: { id: string; name: string; company: { name: string } | null } | null
        driver: { id: string; full_name: string } | null
        delivery_items: { id: string }[]
    }
    compact?: boolean
}) {
    const statusInfo = deliveryStatusConfig[delivery.status || 'planned'] || deliveryStatusConfig.planned
    const StatusIcon = statusInfo.icon
    const itemCount = delivery.delivery_items?.length || 0
    const project = delivery.project as { id: string; name: string; company: { name: string } | null } | null
    const driver = delivery.driver as { id: string; full_name: string } | null

    if (compact) {
        return (
            <Link href={`/factory/deliveries/${delivery.id}`}>
                <Card className="border-zinc-200 hover:border-zinc-300 transition-colors">
                    <CardContent className="py-3 flex items-center gap-4">
                        <Badge variant="secondary" className={`${statusInfo.color} gap-1 text-xs`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                        </Badge>
                        <span className="text-sm font-medium text-zinc-900">{project?.name}</span>
                        <span className="text-xs text-zinc-500">{itemCount} einingar</span>
                        {driver && <span className="text-xs text-zinc-500 ml-auto">{driver.full_name}</span>}
                    </CardContent>
                </Card>
            </Link>
        )
    }

    return (
        <Link href={`/factory/deliveries/${delivery.id}`}>
            <Card className={`border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all ${!driver ? 'border-amber-200' : ''}`}>
                <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="secondary" className={`${statusInfo.color} gap-1`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {statusInfo.label}
                                </Badge>
                                <h3 className="text-base font-semibold text-zinc-900 truncate">
                                    {project?.name || 'Óþekkt verkefni'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-600">
                                {project?.company?.name && (
                                    <span>{project.company.name}</span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5" />
                                    {itemCount} einingar
                                </span>
                                {delivery.truck_registration && (
                                    <span className="flex items-center gap-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        {delivery.truck_registration}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 text-sm">
                                {driver ? (
                                    <span className="flex items-center gap-1 text-zinc-600">
                                        <User className="w-3.5 h-3.5" />
                                        {driver.full_name}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Enginn bílstjóri úthlutaður
                                    </span>
                                )}
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-300 flex-shrink-0 mt-1" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
