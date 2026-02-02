import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function DeliveriesPage() {
    const supabase = await createClient()

    // Fetch latest 100 deliveries
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select(`
            *,
            project:projects(name, company:companies(name)),
            driver:profiles!deliveries_driver_id_fkey(full_name)
        `)
        .order('planned_date', { ascending: false })
        .limit(100)

    const statusConfig: Record<string, { label: string; color: string }> = {
        planned: { label: 'Skipulögð', color: 'bg-zinc-100 text-zinc-700' },
        loading: { label: 'Hleðsla', color: 'bg-orange-100 text-orange-700' },
        in_transit: { label: 'Á leið', color: 'bg-purple-100 text-purple-700' },
        arrived: { label: 'Mætt', color: 'bg-blue-100 text-blue-700' },
        completed: { label: 'Lokið', color: 'bg-green-100 text-green-700' },
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Afhendingar (Deliveries)</h1>
                    <p className="text-muted-foreground">Yfirlit yfir allar afhendingar (Last 100)</p>
                </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Dagsetning</TableHead>
                            <TableHead>Verkefni</TableHead>
                            <TableHead>Bílstjóri</TableHead>
                            <TableHead>Staða</TableHead>
                            <TableHead className="text-right">Bíll</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!deliveries || deliveries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    Engar afhendingar fundust.
                                </TableCell>
                            </TableRow>
                        ) : (
                            deliveries.map((delivery) => {
                                const status = statusConfig[delivery.status || 'planned'] || statusConfig.planned
                                return (
                                    <TableRow key={delivery.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">
                                            {delivery.planned_date}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{delivery.project?.name}</span>
                                                <span className="text-xs text-muted-foreground">{delivery.project?.company?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {delivery.driver?.full_name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={status.color}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {delivery.truck_registration}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
