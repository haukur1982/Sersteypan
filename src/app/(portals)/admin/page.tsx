import { getServerUser } from '@/lib/auth/getServerUser'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Building2,
  FolderKanban,
  Users,
  Package,
  Truck,
  CheckCircle2,
  Plus,
  Search
} from 'lucide-react'
import { TrendCard } from '@/components/admin/TrendCard'
import { StatusDonutChart } from '@/components/admin/StatusDonutChart'
import { DailySummaryCard } from '@/components/shared/DailySummaryCard'

const statusConfig: Record<string, { label: string; color: string; chartColor: string }> = {
  planned: { label: 'Skipulögð', color: 'bg-zinc-100 text-zinc-700', chartColor: '#a1a1aa' },
  rebar: { label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800', chartColor: '#eab308' },
  cast: { label: 'Steypt', color: 'bg-orange-100 text-orange-800', chartColor: '#f97316' },
  curing: { label: 'Þornar', color: 'bg-amber-100 text-amber-800', chartColor: '#f59e0b' },
  ready: { label: 'Tilbúið', color: 'bg-green-100 text-green-700', chartColor: '#22c55e' },
  loaded: { label: 'Á bíl', color: 'bg-blue-100 text-blue-700', chartColor: '#3b82f6' },
  delivered: { label: 'Afhent', color: 'bg-emerald-100 text-emerald-700', chartColor: '#10b981' },
}

export default async function AdminDashboard() {
  const user = await getServerUser()
  const supabase = await createClient()

  // Date boundaries for week-over-week comparison
  const now = new Date()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
  startOfThisWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const thisWeekISO = startOfThisWeek.toISOString()
  const lastWeekISO = startOfLastWeek.toISOString()

  // Fetch all data in parallel
  const [
    companiesResult,
    projectsResult,
    usersResult,
    elementsResult,
    deliveriesResult,
    recentElementsResult,
    recentDeliveriesResult,
    elementsByStatusResult,
    // Week-over-week: elements created
    elementsThisWeekResult,
    elementsLastWeekResult,
    // Week-over-week: deliveries created
    deliveriesThisWeekResult,
    deliveriesLastWeekResult,
  ] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('elements').select('id', { count: 'exact', head: true }),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }),
    supabase
      .from('elements')
      .select('id, name, status, created_at, project:projects(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('deliveries')
      .select('id, status, created_at, project:projects(name), driver:profiles!deliveries_driver_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('elements').select('status'),
    // This week elements
    supabase.from('elements').select('id', { count: 'exact', head: true }).gte('created_at', thisWeekISO),
    // Last week elements
    supabase.from('elements').select('id', { count: 'exact', head: true }).gte('created_at', lastWeekISO).lt('created_at', thisWeekISO),
    // This week deliveries
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', thisWeekISO),
    // Last week deliveries
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', lastWeekISO).lt('created_at', thisWeekISO),
  ])

  const companiesCount = companiesResult.count || 0
  const projectsCount = projectsResult.count || 0
  const usersCount = usersResult.count || 0
  const elementsCount = elementsResult.count || 0
  const deliveriesCount = deliveriesResult.count || 0
  const recentElements = recentElementsResult.data || []
  const recentDeliveries = recentDeliveriesResult.data || []

  const elementsThisWeek = elementsThisWeekResult.count || 0
  const elementsLastWeek = elementsLastWeekResult.count || 0
  const deliveriesThisWeek = deliveriesThisWeekResult.count || 0
  const deliveriesLastWeek = deliveriesLastWeekResult.count || 0

  // Element status breakdown for donut chart
  const elementStatuses = elementsByStatusResult.data || []
  const rawCounts: Record<string, number> = {}
  for (const el of elementStatuses) {
    const s = el.status || 'planned'
    rawCounts[s] = (rawCounts[s] || 0) + 1
  }

  // Build chart data from known statuses
  const chartData = Object.entries(statusConfig)
    .map(([status, config]) => ({
      name: config.label,
      value: rawCounts[status] || 0,
      color: config.chartColor,
    }))
    .filter(d => d.value > 0)

  // Count ready elements
  const readyCount = rawCounts['ready'] || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stjórnborð</h1>
          <p className="text-muted-foreground mt-1">
            Velkomin, {user?.fullName || 'Stjórnandi'}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/search">
            <Search className="w-4 h-4 mr-2" />
            Leita
          </Link>
        </Button>
      </div>

      {/* AI Daily Summary */}
      <DailySummaryCard />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <TrendCard
          title="Fyrirtæki"
          value={companiesCount}
          icon={Building2}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          href="/admin/companies"
        />
        <TrendCard
          title="Verkefni"
          value={projectsCount}
          icon={FolderKanban}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          href="/admin/projects"
        />
        <TrendCard
          title="Notendur"
          value={usersCount}
          icon={Users}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          href="/admin/users"
        />
        <TrendCard
          title="Einingar"
          value={elementsCount}
          icon={Package}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          href="/admin/elements"
          thisWeek={elementsThisWeek}
          lastWeek={elementsLastWeek}
        />
        <TrendCard
          title="Afhendingar"
          value={deliveriesCount}
          icon={Truck}
          iconBg="bg-cyan-100"
          iconColor="text-cyan-600"
          href="/admin/deliveries"
          thisWeek={deliveriesThisWeek}
          lastWeek={deliveriesLastWeek}
        />
        <TrendCard
          title="Tilbúið"
          value={readyCount}
          icon={CheckCircle2}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          highlight
        />
      </div>

      {/* Status Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Staða eininga</h2>
          <StatusDonutChart data={chartData} total={elementsCount} />
        </Card>

        {/* Recent Elements */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Nýlegar einingar</h2>
            <Link href="/admin/elements" className="text-sm text-primary hover:underline flex items-center gap-1">
              Sjá allt <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentElements.length === 0 ? (
            <p className="text-muted-foreground text-sm">Engar einingar ennþá</p>
          ) : (
            <div className="space-y-3">
              {recentElements.map((element) => {
                const status = statusConfig[element.status || 'planned'] || statusConfig.planned
                const project = element.project as { name: string } | null
                return (
                  <div key={element.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{element.name}</p>
                      <p className="text-xs text-muted-foreground">{project?.name || '-'}</p>
                    </div>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Deliveries */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Nýlegar afhendingar</h2>
          <Link href="/admin/deliveries" className="text-sm text-primary hover:underline flex items-center gap-1">
            Sjá allt <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentDeliveries.length === 0 ? (
          <p className="text-muted-foreground text-sm">Engar afhendingar ennþá</p>
        ) : (
          <div className="space-y-3">
            {recentDeliveries.map((delivery) => {
              const status = statusConfig[delivery.status || 'planned'] || statusConfig.planned
              const project = delivery.project as { name: string } | null
              const driver = delivery.driver as { full_name: string } | null
              return (
                <div key={delivery.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{project?.name || 'Afhending'}</p>
                    <p className="text-xs text-muted-foreground">
                      {driver?.full_name || 'Enginn bílstjóri'} &middot; {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString('is-IS') : '-'}
                    </p>
                  </div>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h2 className="text-lg font-semibold text-foreground mb-4">Flýtiaðgerðir</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button asChild variant="outline" className="bg-card hover:bg-accent">
            <Link href="/admin/companies/new">
              <Plus className="w-4 h-4 mr-2" />
              Nýtt fyrirtæki
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-card hover:bg-accent">
            <Link href="/admin/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              Nýtt verkefni
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-card hover:bg-accent">
            <Link href="/admin/users/new">
              <Plus className="w-4 h-4 mr-2" />
              Nýr notandi
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-card hover:bg-accent">
            <Link href="/admin/search">
              <Search className="w-4 h-4 mr-2" />
              Leita
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
