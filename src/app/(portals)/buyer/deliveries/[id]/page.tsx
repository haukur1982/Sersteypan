import { notFound } from 'next/navigation'
import { getDeliveryDetail } from '@/lib/buyer/queries'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar, User, Phone, MapPin, FileSignature } from 'lucide-react'
import type { Database } from '@/types/database'

type DeliveryRow = Database['public']['Tables']['deliveries']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type DeliveryItemRow = Database['public']['Tables']['delivery_items']['Row']
type ElementRow = Database['public']['Tables']['elements']['Row']
type ElementPhotoRow = Database['public']['Tables']['element_photos']['Row']

type DeliveryItemDetail = DeliveryItemRow & {
  element: (Pick<ElementRow, 'id' | 'name' | 'element_type' | 'drawing_reference' | 'status'> & {
    photos: ElementPhotoRow[]
  }) | null
}

type DeliveryDetail = DeliveryRow & {
  project: Pick<ProjectRow, 'id' | 'name' | 'address'> | null
  driver: Pick<ProfileRow, 'id' | 'full_name' | 'phone'> | null
  items: DeliveryItemDetail[]
}

export default async function DeliveryDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const delivery = (await getDeliveryDetail(id)) as DeliveryDetail | null

  if (!delivery) {
    notFound()
  }

  const statusConfig = {
    planned: { label: 'Áætlað', color: 'bg-zinc-100 text-zinc-800' },
    loading: { label: 'Í hleðslu', color: 'bg-amber-100 text-amber-800' },
    in_transit: { label: 'Á leiðinni', color: 'bg-blue-100 text-blue-800' },
    delivered: { label: 'Afhent', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Afturkallað', color: 'bg-red-100 text-red-800' }
  } as const

  const currentStatus = delivery.status && delivery.status in statusConfig
    ? statusConfig[delivery.status as keyof typeof statusConfig]
    : { label: 'Óþekkt', color: 'bg-gray-100 text-gray-800' }

  return (
    <div className="space-y-6">
      {/* Header */}
        <div>
          <Link
            href="/buyer/deliveries"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Til baka í afhendingarlistann
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">
                {delivery.project?.name || 'Óþekkt verkefni'}
              </h1>
              <p className="text-zinc-600 mt-1">
                {delivery.truck_registration || 'Bíll ekki skráður'}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">
              Upplýsingar um afhendingu
            </h3>
            <div className="space-y-3">
              {delivery.planned_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">Áætluð dagsetning</p>
                    <p className="font-medium text-zinc-900">
                      {new Date(delivery.planned_date).toLocaleDateString('is-IS', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {delivery.project?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">Afhendingarstaður</p>
                    <p className="font-medium text-zinc-900">
                      {delivery.project.address}
                    </p>
                  </div>
                </div>
              )}

              {delivery.driver && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-500">Bílstjóri</p>
                    <p className="font-medium text-zinc-900">
                      {delivery.driver.full_name}
                    </p>
                    {delivery.driver.phone && (
                      <p className="text-sm text-zinc-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {delivery.driver.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Staða</h3>
            <div className="space-y-4">
              <TimelineStep
                label="Áætlað"
                date={delivery.created_at}
                completed={true}
              />
              <TimelineStep
                label="Hleðsla hafin"
                date={delivery.loading_started_at}
                completed={!!delivery.loading_started_at}
              />
              <TimelineStep
                label="Á leiðinni"
                date={delivery.departed_at}
                completed={!!delivery.departed_at}
              />
              <TimelineStep
                label="Komið á staðinn"
                date={delivery.arrived_at}
                completed={!!delivery.arrived_at}
              />
              <TimelineStep
                label="Afhent"
                date={delivery.completed_at}
                completed={!!delivery.completed_at}
              />
            </div>
          </div>
        </div>

        {/* Elements on Delivery */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-200">
            <h3 className="font-semibold text-zinc-900">
              Einingar ({(delivery.items || []).length})
            </h3>
          </div>
          <div className="divide-y divide-zinc-200">
            {(delivery.items || []).map((item) => (
              <div key={item.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900">
                      {item.element?.name || 'Óþekkt eining'}
                    </p>
                    <p className="text-sm text-zinc-600 mt-1">
                      {item.element?.element_type}
                    </p>
                    {item.load_position && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Staðsetning: {item.load_position}
                      </p>
                    )}
                  </div>
                  {item.delivered_at && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      Afhent
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Confirmation (if completed) */}
        {delivery.status === 'delivered' && (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Afhendingarstaðfesting
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {delivery.received_by_name && (
                <div>
                  <p className="text-sm text-zinc-500">Tekið á móti af</p>
                  <p className="font-medium text-zinc-900 mt-1">
                    {delivery.received_by_name}
                  </p>
                  {delivery.completed_at && (
                    <p className="text-sm text-zinc-600 mt-1">
                      {new Date(delivery.completed_at).toLocaleString('is-IS')}
                    </p>
                  )}
                </div>
              )}

              {delivery.received_by_signature_url && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Undirskrift</p>
                  <Image
                    src={delivery.received_by_signature_url}
                    alt="Signature"
                    width={320}
                    height={96}
                    className="border border-zinc-200 rounded-md max-h-24 w-auto"
                  />
                </div>
              )}
            </div>

            {delivery.delivery_photo_url && (
              <div className="mt-6">
                <p className="text-sm text-zinc-500 mb-2">Mynd frá afhendingu</p>
                <Image
                  src={delivery.delivery_photo_url}
                  alt="Delivery confirmation"
                  width={768}
                  height={512}
                  className="rounded-lg border border-zinc-200 max-w-md w-full h-auto"
                />
              </div>
            )}
          </div>
        )}
      </div>
  )
}

function TimelineStep({
  label,
  date,
  completed
}: {
  label: string
  date: string | null
  completed: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
          completed
            ? 'bg-green-500 border-green-500'
            : 'bg-white border-zinc-300'
        }`}
      />
      <div className="flex-1">
        <p className={`font-medium ${completed ? 'text-zinc-900' : 'text-zinc-500'}`}>
          {label}
        </p>
        {date && (
          <p className="text-sm text-zinc-600 mt-1">
            {new Date(date).toLocaleString('is-IS', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>
    </div>
  )
}
