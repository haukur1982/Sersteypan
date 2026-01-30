import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
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
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search
} from 'lucide-react'

export default async function AdminDashboard() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'admin') {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch all counts in parallel
  const [
    companiesResult,
    projectsResult,
    usersResult,
    elementsResult,
    deliveriesResult,
    recentElementsResult,
    recentDeliveriesResult,
    elementsByStatusResult
  ] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('elements').select('id', { count: 'exact', head: true }),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }),
    // Recent elements (last 5)
    supabase
      .from('elements')
      .select('id, name, status, created_at, project:projects(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    // Recent deliveries (last 5)
    supabase
      .from('deliveries')
      .select('id, status, created_at, project:projects(name), driver:profiles!deliveries_driver_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    // Element status breakdown
    supabase
      .from('elements')
      .select('status')
  ])

  const companiesCount = companiesResult.count || 0
  const projectsCount = projectsResult.count || 0
  const usersCount = usersResult.count || 0
  const elementsCount = elementsResult.count || 0
  const deliveriesCount = deliveriesResult.count || 0
  const recentElements = recentElementsResult.data || []
  const recentDeliveries = recentDeliveriesResult.data || []

  // Calculate element stats by status
  const elementStatuses = elementsByStatusResult.data || []
  const statusCounts = elementStatuses.reduce((acc: Record<string, number>, el) => {
    const status = el.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const inProduction = (statusCounts['in_production'] || 0) + (statusCounts['formwork'] || 0) + (statusCounts['reinforcement'] || 0)
  const readyForDelivery = statusCounts['ready_for_delivery'] || 0
  const delivered = statusCounts['delivered'] || 0

  // Status badge config
  const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'Skipulögð', color: 'bg-zinc-100 text-zinc-700' },
    design: { label: 'Hönnun', color: 'bg-blue-100 text-blue-700' },
    in_production: { label: 'Í framleiðslu', color: 'bg-yellow-100 text-yellow-800' },
    ready_for_delivery: { label: 'Tilbúið', color: 'bg-green-100 text-green-700' },
    delivered: { label: 'Afhent', color: 'bg-emerald-100 text-emerald-700' },
    loading: { label: 'Hleðsla', color: 'bg-orange-100 text-orange-700' },
    in_transit: { label: 'Á leið', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Lokið', color: 'bg-green-100 text-green-700' },
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Stjórnborð
            </h1>
            <p className="text-muted-foreground mt-1">
              Velkomin, {user.fullName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/search">
                <Search className="w-4 h-4 mr-2" />
                Leita
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Companies */}
          <Link href="/admin/companies" className="group">
            <Card className="p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{companiesCount}</p>
                  <p className="text-xs text-muted-foreground">Fyrirtæki</p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Projects */}
          <Link href="/admin/projects" className="group">
            <Card className="p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FolderKanban className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{projectsCount}</p>
                  <p className="text-xs text-muted-foreground">Verkefni</p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Users */}
          <Link href="/admin/users" className="group">
            <Card className="p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{usersCount}</p>
                  <p className="text-xs text-muted-foreground">Notendur</p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Elements Total */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{elementsCount}</p>
                <p className="text-xs text-muted-foreground">Einingar</p>
              </div>
            </div>
          </Card>

          {/* Deliveries */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <Truck className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{deliveriesCount}</p>
                <p className="text-xs text-muted-foreground">Afhendingar</p>
              </div>
            </div>
          </Card>

          {/* Ready for Delivery */}
          <Card className="p-4 border-green-200 bg-green-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{readyForDelivery}</p>
                <p className="text-xs text-green-600">Tilbúið</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Production Stats Bar */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Framleiðslustaða</h2>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Í framleiðslu</span>
                  <span className="font-medium">{inProduction}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${elementsCount > 0 ? (inProduction / elementsCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Tilbúið til afhendingar</span>
                  <span className="font-medium">{readyForDelivery}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${elementsCount > 0 ? (readyForDelivery / elementsCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Afhent</span>
                  <span className="font-medium">{delivered}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${elementsCount > 0 ? (delivered / elementsCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <p className="text-xs text-muted-foreground">{project?.name || 'No project'}</p>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

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
                          {driver?.full_name || 'Enginn bílstjóri'} • {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString('is-IS') : '-'}
                        </p>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

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
    </DashboardLayout>
  )
}
