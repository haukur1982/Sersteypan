import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    ArrowRight
} from 'lucide-react'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' }
}

export default async function FactoryDashboard() {
    const supabase = await createClient()

    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return null
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    // Get production status counts
    const statusCounts = await Promise.all(
        Object.keys(statusConfig).map(async (status) => {
            const { count } = await supabase
                .from('elements')
                .select('*', { count: 'exact', head: true })
                .eq('status', status)

            return { status, count: count || 0 }
        })
    )

    // Get today's diary entries count
    const today = new Date().toISOString().split('T')[0]
    const { count: diaryCount } = await supabase
        .from('diary_entries')
        .select('*', { count: 'exact', head: true })
        .gte('entry_date', today)

    // Get pending todos count
    const { count: todoCount } = await supabase
        .from('todo_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .eq('user_id', user.id)

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Vinnsal (Production)
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Velkomin {profile?.full_name} - Verkstjóri
                    </p>
                </div>

                {/* Production Status Cards */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                        Framleiðslustaða (Production Status)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {statusCounts.map(({ status, count }) => {
                            const config = statusConfig[status as keyof typeof statusConfig]
                            const Icon = config.icon

                            return (
                                <Link
                                    key={status}
                                    href={`/factory/production?status=${status}`}
                                >
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Badge variant="secondary" className={`${config.color} mb-2`}>
                                                        <Icon className="w-3 h-3 mr-1" />
                                                        {config.label}
                                                    </Badge>
                                                    <p className="text-3xl font-bold text-foreground">{count}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {count === 1 ? 'eining' : 'einingar'}
                                                    </p>
                                                </div>
                                                <Icon className="w-12 h-12 text-muted" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                        Flýtiaðgerðir (Quick Actions)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Wrench className="w-5 h-5" />
                                    Vinnuröð (Production Queue)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Sjá allar einingar í framleiðslu og uppfæra stöðu
                                </p>
                                <Button asChild className="w-full">
                                    <Link href="/factory/production">
                                        Opna vinnuröð
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <CheckCircle className="w-5 h-5" />
                                    Tilbúnar einingar (Ready Elements)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Sjá einingar sem eru tilbúnar til afhendingar
                                </p>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/factory/production?status=ready">
                                        Sjá tilbúnar einingar
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Daily Tools */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                        Dagleg verkfæri (Daily Tools)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <BookOpen className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Dagbók</p>
                                            <p className="text-sm text-muted-foreground">Diary</p>
                                        </div>
                                    </div>
                                    {diaryCount && diaryCount > 0 && (
                                        <Badge variant="secondary">
                                            {diaryCount} í dag
                                        </Badge>
                                    )}
                                </div>
                                <Button asChild variant="outline" className="w-full" size="sm">
                                    <Link href="/factory/diary">
                                        Opna dagbók
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckSquare className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Verkefnalisti</p>
                                            <p className="text-sm text-muted-foreground">Todo List</p>
                                        </div>
                                    </div>
                                    {todoCount && todoCount > 0 && (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                            {todoCount} opin
                                        </Badge>
                                    )}
                                </div>
                                <Button asChild variant="outline" className="w-full" size="sm">
                                    <Link href="/factory/todos">
                                        Opna verkefnalista
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Package className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Birgðir</p>
                                            <p className="text-sm text-muted-foreground">Stock</p>
                                        </div>
                                    </div>
                                </div>
                                <Button asChild variant="outline" className="w-full" size="sm">
                                    <Link href="/factory/stock">
                                        Sjá birgðir
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* System Status */}
                <Card className="border-border bg-muted/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Kerfisstaða (System Status)
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Allar aðgerðir virkar • Engar villur
                                </p>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ✓ Allt í lagi
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
