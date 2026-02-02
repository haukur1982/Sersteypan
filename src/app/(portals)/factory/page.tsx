import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    BookOpen,
    CheckSquare,
    Package,
    ArrowRight,
    TrendingUp,
    AlertTriangle
} from 'lucide-react'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' },
    delivered: { icon: CheckCircle, label: 'Afhent', color: 'bg-emerald-100 text-emerald-800' }
}

export default async function FactoryDashboard() {
    const supabase = await createClient()

    // Get user info (layout handles auth)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user?.id || '')
        .single()

    const today = new Date().toISOString().split('T')[0]

    // Fetch all data in parallel
    const [
        elementsByStatusResult,
        deliveredTodayResult,
        recentDiaryResult,
        todoCountResult,
        totalElementsResult
    ] = await Promise.all([
        // All elements with status
        supabase.from('elements').select('status'),
        // Delivered today
        supabase
            .from('elements')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'delivered')
            .gte('delivered_at', today),
        // Recent diary entries (last 3)
        supabase
            .from('diary_entries')
            .select('id, title, content, entry_date, created_at')
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(3),
        // Pending todos count
        supabase
            .from('todo_items')
            .select('*', { count: 'exact', head: true })
            .eq('is_completed', false)
            .eq('user_id', user?.id || ''),
        // Total elements
        supabase.from('elements').select('id', { count: 'exact', head: true })
    ])

    // Try to fetch stock alerts (may not exist yet)
    let stockAlertsCount = 0
    try {
        const { data: stockItems } = await supabase
            .from('stock_items')
            .select('reorder_level, quantity_on_hand')

        if (stockItems) {
            // Count items where quantity_on_hand < reorder_level
            stockAlertsCount = stockItems.filter((item) => {
                const reorderLevel = item.reorder_level
                const qty = item.quantity_on_hand
                return typeof reorderLevel === 'number' && typeof qty === 'number' && qty < reorderLevel
            }).length
        }
    } catch {
        // Stock table might not exist yet - that's OK
        stockAlertsCount = 0
    }

    // Process element statuses
    const allElements = elementsByStatusResult.data || []
    const statusCounts: Record<string, number> = {}
    allElements.forEach((el) => {
        const status = el.status || 'planned'
        statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    // Calculate summary stats
    const inProduction = (statusCounts['rebar'] || 0) + (statusCounts['cast'] || 0) + (statusCounts['curing'] || 0)
    const readyToShip = statusCounts['ready'] || 0
    const deliveredToday = deliveredTodayResult.count || 0
    const totalElements = totalElementsResult.count || 0

    const recentDiaryEntries = recentDiaryResult.data || []
    const todoCount = todoCountResult.count || 0

    return (
        <div className="space-y-8">
            {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Verksmiðja
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Velkomin {profile?.full_name} - Verkstjóri
                    </p>
                </div>

                {/* Summary Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* In Production */}
                    <Card className="p-4 border-yellow-200 bg-yellow-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-100">
                                <Wrench className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-700">{inProduction}</p>
                                <p className="text-xs text-yellow-600">Í framleiðslu</p>
                            </div>
                        </div>
                    </Card>

                    {/* Ready to Ship */}
                    <Card className="p-4 border-green-200 bg-green-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-700">{readyToShip}</p>
                                <p className="text-xs text-green-600">Tilbúið</p>
                            </div>
                        </div>
                    </Card>

                    {/* Shipped Today */}
                    <Card className="p-4 border-blue-200 bg-blue-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <Truck className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{deliveredToday}</p>
                                <p className="text-xs text-blue-600">Afhent í dag</p>
                            </div>
                        </div>
                    </Card>

                    {/* Stock Alerts */}
                    <Card className={`p-4 ${stockAlertsCount > 0 ? 'border-red-200 bg-red-50/50' : 'border-zinc-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${stockAlertsCount > 0 ? 'bg-red-100' : 'bg-zinc-100'}`}>
                                <AlertTriangle className={`w-5 h-5 ${stockAlertsCount > 0 ? 'text-red-600' : 'text-zinc-600'}`} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${stockAlertsCount > 0 ? 'text-red-700' : 'text-zinc-700'}`}>{stockAlertsCount}</p>
                                <p className={`text-xs ${stockAlertsCount > 0 ? 'text-red-600' : 'text-zinc-600'}`}>Birgðaviðvaranir</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Production Pipeline Progress */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">Framleiðslulína</h2>
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Planned */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Skipulagt</span>
                                <span className="font-medium">{statusCounts['planned'] || 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gray-500 rounded-full"
                                    style={{ width: `${totalElements > 0 ? ((statusCounts['planned'] || 0) / totalElements) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Rebar */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Járnabundið</span>
                                <span className="font-medium">{statusCounts['rebar'] || 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-500 rounded-full"
                                    style={{ width: `${totalElements > 0 ? ((statusCounts['rebar'] || 0) / totalElements) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Cast */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Steypt</span>
                                <span className="font-medium">{statusCounts['cast'] || 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 rounded-full"
                                    style={{ width: `${totalElements > 0 ? ((statusCounts['cast'] || 0) / totalElements) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Curing */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Þornar</span>
                                <span className="font-medium">{statusCounts['curing'] || 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${totalElements > 0 ? ((statusCounts['curing'] || 0) / totalElements) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Ready */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Tilbúið</span>
                                <span className="font-medium">{statusCounts['ready'] || 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full"
                                    style={{ width: `${totalElements > 0 ? ((statusCounts['ready'] || 0) / totalElements) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Two Column Layout: Recent Diary + Detail Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Diary Entries */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Nýlegar dagbókarfærslur</h2>
                            <Link href="/factory/diary" className="text-sm text-primary hover:underline flex items-center gap-1">
                                Sjá allt <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        {recentDiaryEntries.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Engar dagbókarfærslur ennþá</p>
                        ) : (
                            <div className="space-y-3">
                                {recentDiaryEntries.map((entry) => (
                                    <div key={entry.id} className="py-2 border-b border-border last:border-0">
                                        <p className="font-medium text-foreground">{entry.title || 'Dagbókarfærsla'}</p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {entry.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('is-IS') : '-'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Detailed Status Breakdown */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Nákvæm staða</h2>
                            <Link href="/factory/production" className="text-sm text-primary hover:underline flex items-center gap-1">
                                Sjá allt <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(statusConfig).map(([status, config]) => {
                                const count = statusCounts[status] || 0
                                const Icon = config.icon
                                return (
                                    <Link
                                        key={status}
                                        href={`/factory/production?status=${status}`}
                                        className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-accent/50 rounded px-2 -mx-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-foreground">{config.label}</span>
                                        </div>
                                        <Badge variant="secondary" className={config.color}>
                                            {count}
                                        </Badge>
                                    </Link>
                                )
                            })}
                        </div>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Flýtiaðgerðir</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button asChild variant="outline" className="bg-card hover:bg-accent">
                            <Link href="/factory/production">
                                <Wrench className="w-4 h-4 mr-2" />
                                Vinnuröð
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="bg-card hover:bg-accent">
                            <Link href="/factory/diary">
                                <BookOpen className="w-4 h-4 mr-2" />
                                Dagbók
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="bg-card hover:bg-accent">
                            <Link href="/factory/todos">
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Verkefni ({todoCount})
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="bg-card hover:bg-accent">
                            <Link href="/factory/stock">
                                <Package className="w-4 h-4 mr-2" />
                                Birgðir
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>
    )
}
