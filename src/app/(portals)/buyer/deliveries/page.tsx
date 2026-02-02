import { getBuyerDeliveries } from '@/lib/buyer/queries'
import Link from 'next/link'
import { Truck, Calendar, ArrowRight } from 'lucide-react'
import type { Database } from '@/types/database'

type DeliveryRow = Database['public']['Tables']['deliveries']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type DeliveryItemRow = Database['public']['Tables']['delivery_items']['Row']
type ElementRow = Database['public']['Tables']['elements']['Row']

type DeliveryItemSummary = DeliveryItemRow & {
  element: Pick<ElementRow, 'id' | 'name' | 'element_type'> | null
}

type DeliverySummary = DeliveryRow & {
  project: Pick<ProjectRow, 'id' | 'name' | 'address'> | null
  driver: Pick<ProfileRow, 'id' | 'full_name' | 'phone'> | null
  items: DeliveryItemSummary[]
}

export default async function DeliveriesListPage() {
  const deliveries = (await getBuyerDeliveries()) as DeliverySummary[]

  // Group deliveries by status
  const planned = deliveries.filter((d) => d.status === 'planned')
  const active = deliveries.filter(
    (d) => d.status === 'loading' || d.status === 'in_transit'
  )
  const completed = deliveries.filter((d) => d.status === 'delivered')

  const statusColors = {
    planned: 'bg-zinc-100 text-zinc-800',
    loading: 'bg-amber-100 text-amber-800',
    in_transit: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  const statusLabels = {
    planned: 'Áætlað',
    loading: 'Í hleðslu',
    in_transit: 'Á leiðinni',
    delivered: 'Afhent',
    cancelled: 'Afturkallað'
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Afhendingar</h1>
          <p className="text-zinc-600 mt-1">
            Allar afhendingar fyrir þín verkefni ({deliveries.length})
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <p className="text-sm text-zinc-500">Áætlaðar</p>
            <p className="text-3xl font-bold text-zinc-900 mt-2">
              {planned.length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <p className="text-sm text-zinc-500">Í gangi</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {active.length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <p className="text-sm text-zinc-500">Afhentar</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {completed.length}
            </p>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-6 py-12 text-center">
            <Truck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Engar afhendingar</p>
            <p className="text-sm text-zinc-400 mt-1">
              Engar afhendingar áætlaðar eða í gangi
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Deliveries */}
            {active.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Í gangi ({active.length})
                </h2>
                <div className="space-y-4">
                  {active.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      statusColors={statusColors}
                      statusLabels={statusLabels}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Planned Deliveries */}
            {planned.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Áætlaðar ({planned.length})
                </h2>
                <div className="space-y-4">
                  {planned.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      statusColors={statusColors}
                      statusLabels={statusLabels}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Deliveries */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Afhentar ({completed.length})
                </h2>
                <div className="space-y-4">
                  {completed.slice(0, 10).map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      statusColors={statusColors}
                      statusLabels={statusLabels}
                    />
                  ))}
                </div>
                {completed.length > 10 && (
                  <p className="text-sm text-zinc-500 mt-4">
                    Og {completed.length - 10} eldri afhendingar...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  )
}

function DeliveryCard({
  delivery,
  statusColors,
  statusLabels
}: {
  delivery: DeliverySummary
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
}) {
  const itemCount = (delivery.items || []).length
  const statusKey = delivery.status && delivery.status in statusColors
    ? delivery.status
    : 'planned'

  return (
    <Link href={`/buyer/deliveries/${delivery.id}`} className="block">
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-zinc-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-zinc-900">
                    {delivery.project?.name || 'Óþekkt verkefni'}
                  </p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[statusKey]
                    }`}
                  >
                    {statusLabels[statusKey]}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 mt-1">
                  {delivery.truck_registration || 'Bíll ekki skráður'} •{' '}
                  {itemCount} {itemCount === 1 ? 'eining' : 'einingar'}
                </p>
              </div>
            </div>

            {delivery.planned_date && (
              <div className="flex items-center gap-2 mt-3 text-sm text-zinc-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(delivery.planned_date).toLocaleDateString('is-IS', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}

            {delivery.driver && (
              <p className="text-sm text-zinc-600 mt-2">
                Bílstjóri: {delivery.driver.full_name}
              </p>
            )}

            {delivery.project?.address && (
              <p className="text-sm text-zinc-500 mt-2">
                📍 {delivery.project.address}
              </p>
            )}
          </div>

          <ArrowRight className="w-5 h-5 text-zinc-400 flex-shrink-0" />
        </div>
      </div>
    </Link>
  )
}
