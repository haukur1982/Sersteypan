'use client'

import Link from 'next/link'
import { Truck, Calendar } from 'lucide-react'
import type { Delivery } from './types'

interface DeliveriesTabProps {
  deliveries: Delivery[]
}

export function DeliveriesTab({ deliveries }: DeliveriesTabProps) {
  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-6 py-12 text-center">
        <Truck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 font-medium">Engar afhendingar</p>
        <p className="text-sm text-zinc-400 mt-1">
          Engar afhendingar áætlaðar eða í gangi
        </p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    planned: 'bg-zinc-100 text-zinc-800',
    loading: 'bg-amber-100 text-amber-800',
    in_transit: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  const statusLabels: Record<string, string> = {
    planned: 'Áætlað',
    loading: 'Í hleðslu',
    in_transit: 'Á leiðinni',
    delivered: 'Afhent',
    cancelled: 'Afturkallað'
  }

  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => {
        const itemCount = (delivery.items || []).length
        const statusKey = delivery.status && delivery.status in statusColors
          ? delivery.status
          : 'planned'

        return (
          <Link
            key={delivery.id}
            href={`/buyer/deliveries/${delivery.id}`}
            className="block"
          >
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-900">
                        {delivery.truck_registration || 'Bíll ekki skráður'}
                      </p>
                      <p className="text-sm text-zinc-600 mt-1">
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
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[statusKey]
                    }`}
                >
                  {statusLabels[statusKey]}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
