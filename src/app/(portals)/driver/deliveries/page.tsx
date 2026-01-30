import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Truck, Package, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react'

export const metadata = {
    title: 'Afhendingar | Sérsteypan',
    description: 'Yfirlit yfir allar afhendingar',
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    planned: { label: 'Skipulögð', color: 'bg-zinc-100 text-zinc-700', icon: Clock },
    loading: { label: 'Hleðsla', color: 'bg-yellow-100 text-yellow-800', icon: Package },
    in_transit: { label: 'Á leið', color: 'bg-blue-100 text-blue-800', icon: Truck },
    arrived: { label: 'Komin', color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
    completed: { label: 'Lokið', color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

export default async function DeliveriesPage() {
    const user = await getUser()

    if (!user || user.role !== 'driver') {
        redirect('/login')
    }

    const supabase = await createClient()

    // Fetch deliveries for this driver
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select(`
            id,
            status,
            planned_date,
            truck_registration,
            created_at,
            project:projects(
                id,
                name,
                address,
                company:companies(name)
            ),
            delivery_items(count)
        `)
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching deliveries:', error)
    }

    const activeDeliveries = deliveries?.filter(d => d.status !== 'completed') || []
    const completedDeliveries = deliveries?.filter(d => d.status === 'completed') || []

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Afhendingar</h1>
                        <p className="text-muted-foreground mt-1">
                            Allar þínar afhendingar
                        </p>
                    </div>
                    <Link href="/driver/deliveries/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Ný afhending
                        </Button>
                    </Link>
                </div>

                {/* Active Deliveries */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">
                        Virkar afhendingar ({activeDeliveries.length})
                    </h2>

                    {activeDeliveries.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Truck className="w-12 h-12 mx-auto text-muted-foreground/50" />
                            <p className="text-muted-foreground mt-3">Engar virkar afhendingar</p>
                            <Link href="/driver/deliveries/new" className="mt-4 inline-block">
                                <Button variant="outline">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Byrja nýja afhendingu
                                </Button>
                            </Link>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {activeDeliveries.map((delivery) => {
                                const statusKey: string = delivery.status ?? 'planned'
                                const status = statusConfig[statusKey] || statusConfig.planned
                                const StatusIcon = status.icon
                                const project = delivery.project as { id: string; name: string; address: string | null; company: { name: string } | null } | null

                                return (
                                    <Link key={delivery.id} href={`/driver/deliveries/${delivery.id}`}>
                                        <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${status.color}`}>
                                                        <StatusIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {project?.name || 'Óþekkt verkefni'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {project?.company?.name}
                                                            {delivery.truck_registration && ` • ${delivery.truck_registration}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge className={status.color}>
                                                        {status.label}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString('is-IS') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Completed Deliveries */}
                {completedDeliveries.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">
                            Loknar afhendingar ({completedDeliveries.length})
                        </h2>
                        <div className="space-y-3">
                            {completedDeliveries.slice(0, 10).map((delivery) => {
                                const project = delivery.project as { id: string; name: string; address: string | null; company: { name: string } | null } | null

                                return (
                                    <Link key={delivery.id} href={`/driver/deliveries/${delivery.id}`}>
                                        <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer opacity-75">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-green-100">
                                                        <CheckCircle className="w-5 h-5 text-green-700" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {project?.name || 'Óþekkt verkefni'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {project?.company?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge className="bg-green-100 text-green-800">
                                                        Lokið
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString('is-IS') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
