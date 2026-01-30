'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Truck, MapPin, Package, ArrowRight, Clock } from 'lucide-react'
import type { Database } from '@/types/database'

interface DriverDeliveryListProps {
    deliveries: DriverDeliverySummary[]
}

type DeliveryRow = Database['public']['Tables']['deliveries']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type DeliveryItemRow = Database['public']['Tables']['delivery_items']['Row']
type ElementRow = Database['public']['Tables']['elements']['Row']

type DriverDeliveryItem = DeliveryItemRow & {
    element: Pick<ElementRow, 'id' | 'name'> | null
}

type DriverDeliverySummary = Pick<
    DeliveryRow,
    'id' | 'truck_registration' | 'status' | 'planned_date'
> & {
    project: Pick<ProjectRow, 'id' | 'name' | 'address'> | null
    items: DriverDeliveryItem[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'Skipulagt', color: 'bg-zinc-100 text-zinc-800' },
    loading: { label: 'Í hleðslu', color: 'bg-amber-100 text-amber-800' },
    in_transit: { label: 'Á leiðinni', color: 'bg-blue-100 text-blue-800' },
    arrived: { label: 'Kominn á staðinn', color: 'bg-indigo-100 text-indigo-800' },
    completed: { label: 'Afhent', color: 'bg-green-100 text-green-800' }
}

export function DriverDeliveryList({ deliveries }: DriverDeliveryListProps) {
    if (deliveries.length === 0) {
        return (
            <Card className="border-dashed border-zinc-300">
                <CardContent className="py-12 text-center">
                    <Truck className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <p className="text-zinc-500 font-medium">Engar virkar afhendingar</p>
                    <p className="text-sm text-zinc-400 mt-1">
                        Þú ert ekki með neinar afhendingar skráðar á þig í bili.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {deliveries.map((delivery) => {
                const status = statusConfig[delivery.status] || statusConfig.planned
                const itemCount = delivery.items?.length || 0

                return (
                    <Card key={delivery.id} className="border-zinc-200 hover:border-zinc-300 transition-colors shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className={`${status.color} border-0`}>
                                            {status.label}
                                        </Badge>
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {delivery.planned_date
                                                ? new Date(delivery.planned_date).toLocaleDateString('is-IS')
                                                : 'Óákveðið'}
                                        </span>
                                        <span className="text-xs font-mono text-zinc-400">
                                            {delivery.truck_registration}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-zinc-900 line-clamp-1">
                                            {delivery.project?.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-zinc-600 mt-1">
                                            <MapPin className="w-4 h-4 text-zinc-400" />
                                            <span className="text-sm">{delivery.project?.address}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                                        <div className="flex items-center gap-1.5">
                                            <Package className="w-4 h-4" />
                                            <span>{itemCount} {itemCount === 1 ? 'eining' : 'einingar'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                    <Button variant="outline" asChild className="flex-1 sm:flex-none">
                                        <Link href={`/driver/deliveries/${delivery.id}`}>
                                            Sjá nánar
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Progress bar for status (visual indicator) */}
                            <div className="h-1 w-full bg-zinc-100">
                                <div
                                    className={`h-full transition-all duration-500 ${delivery.status === 'completed' ? 'bg-green-500 w-full' :
                                            delivery.status === 'arrived' ? 'bg-indigo-500 w-4/5' :
                                                delivery.status === 'in_transit' ? 'bg-blue-500 w-3/5' :
                                                    delivery.status === 'loading' ? 'bg-amber-500 w-2/5' :
                                                        'bg-zinc-300 w-1/5'
                                        }`}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
