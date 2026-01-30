'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Package, Clock, CheckCircle, Truck } from 'lucide-react'

interface Project {
  id: string
  name: string
  address: string | null
  elementCount: number
  statusBreakdown: Record<string, number>
}

interface Delivery {
  id: string
  status: string | null
  project: {
    name: string
  } | null
}

interface BuyerDashboardClientProps {
  user: {
    fullName: string
  }
  initialProjects: Project[]
  initialDeliveries: Delivery[]
}

export function BuyerDashboardClient({
  user,
  initialProjects,
  initialDeliveries
}: BuyerDashboardClientProps) {
  const router = useRouter()

  // Set up real-time subscriptions for elements and deliveries
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to element changes (affects project stats)
    const elementsChannel = supabase
      .channel('buyer-elements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'elements'
        },
        (payload) => {
          console.log('Element changed, refreshing dashboard:', payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to element changes')
        }
      })

    // Subscribe to delivery changes
    const deliveriesChannel = supabase
      .channel('buyer-deliveries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries'
        },
        (payload) => {
          console.log('Delivery changed, refreshing dashboard:', payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to delivery changes')
        }
      })

    // Cleanup on unmount
    return () => {
      elementsChannel.unsubscribe()
      deliveriesChannel.unsubscribe()
    }
  }, [router])

  // Calculate stats from projects and deliveries
  const activeProjects = initialProjects.length
  const totalElements = initialProjects.reduce((sum, p) => sum + p.elementCount, 0)

  const elementsInProgress = initialProjects.reduce(
    (sum, p) =>
      sum +
      (p.statusBreakdown.rebar || 0) +
      (p.statusBreakdown.cast || 0) +
      (p.statusBreakdown.curing || 0),
    0
  )

  const elementsReady = initialProjects.reduce(
    (sum, p) => sum + (p.statusBreakdown.ready || 0),
    0
  )

  const upcomingDeliveries = initialDeliveries.filter(
    (d) => d.status && (d.status === 'planned' || d.status === 'loading')
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Yfirlit</h1>
        <p className="text-zinc-600 mt-1">Velkomin, {user.fullName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/buyer/projects" className="group">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 transition-all hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500">
                Virk verkefni
              </h3>
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">
              {activeProjects}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {totalElements} einingar samtals
            </p>
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Skoða verkefni <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Í vinnslu</h3>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-semibold text-zinc-900 mt-2">
            {elementsInProgress}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Járnabinding, steyptur, þornar
          </p>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Tilbúið</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-semibold text-zinc-900 mt-2">
            {elementsReady}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Tilbúið til afhendingar
          </p>
        </div>

        <Link href="/buyer/deliveries" className="group">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 transition-all hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500">Afhendingar</h3>
              <Truck className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">
              {upcomingDeliveries}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Áætlaðar eða í hleðslu
            </p>
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Skoða afhendingar <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Verkefnin þín
          </h2>
        </div>
        {initialProjects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Engin verkefni</p>
            <p className="text-sm text-zinc-400 mt-1">
              Þú hefur engin virk verkefni
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {initialProjects.map((project) => {
              const totalCount = project.elementCount
              const deliveredCount = project.statusBreakdown.delivered || 0
              const progressPercent =
                totalCount > 0
                  ? Math.round((deliveredCount / totalCount) * 100)
                  : 0

              return (
                <Link
                  key={project.id}
                  href={`/buyer/projects/${project.id}`}
                  className="block px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-900 truncate">
                        {project.name}
                      </h3>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-zinc-600 mb-1">
                          <span>
                            {deliveredCount} af {totalCount} afhent
                          </span>
                          <span className="font-medium">
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Status breakdown */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {project.statusBreakdown.rebar > 0 && (
                          <span className="text-xs text-zinc-600">
                            Járnabundið: {project.statusBreakdown.rebar}
                          </span>
                        )}
                        {project.statusBreakdown.cast > 0 && (
                          <span className="text-xs text-zinc-600">
                            Steypt: {project.statusBreakdown.cast}
                          </span>
                        )}
                        {project.statusBreakdown.ready > 0 && (
                          <span className="text-xs text-green-600 font-medium">
                            Tilbúið: {project.statusBreakdown.ready}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nýlegar afhendingar
          </h2>
          <Link href="/buyer/deliveries" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Sjá allar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {initialDeliveries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Truck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Engar afhendingar</p>
            <p className="text-sm text-zinc-400 mt-1">
              Engar afhendingar hafa verið áætlaðar
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {initialDeliveries.slice(0, 5).map((delivery) => {
              const statusConfig: Record<string, { color: string; label: string }> = {
                planned: { color: 'bg-zinc-100 text-zinc-700', label: 'Áætluð' },
                loading: { color: 'bg-yellow-100 text-yellow-700', label: 'Í hleðslu' },
                in_transit: { color: 'bg-blue-100 text-blue-700', label: 'Á leiðinni' },
                arrived: { color: 'bg-purple-100 text-purple-700', label: 'Komin' },
                completed: { color: 'bg-green-100 text-green-700', label: 'Afhent' },
              }
              const status = statusConfig[delivery.status || 'planned'] || statusConfig.planned

              return (
                <Link
                  key={delivery.id}
                  href={`/buyer/deliveries/${delivery.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {delivery.project?.name || 'Óþekkt verkefni'}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-400" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
