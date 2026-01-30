import { ElementStatusBadge } from './ElementStatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { is } from 'date-fns/locale'

interface ElementEvent {
  id: string
  status: string | null
  previous_status: string | null
  notes: string | null
  created_at: string | null
  created_by: {
    id: string
    full_name: string
  } | null
}

interface ElementTimelineProps {
  events: ElementEvent[]
}

/**
 * Timeline view showing the full history of status changes for an element
 * Displays in chronological order with timestamps and who made each change
 */
export function ElementTimeline({ events }: ElementTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p>Engin saga enn</p>
        <p className="text-sm mt-1">Staða hefur ekki verið uppfærð</p>
      </div>
    )
  }

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => {
        const isLatest = index === 0
        const createdAt = event.created_at ? new Date(event.created_at) : null

        return (
          <div
            key={event.id}
            className={`relative pl-6 pb-4 ${
              index !== sortedEvents.length - 1 ? 'border-l-2 border-zinc-200' : ''
            }`}
          >
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-0 -ml-[9px] h-4 w-4 rounded-full border-2 ${
                isLatest
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white border-zinc-300'
              }`}
            />

            {/* Event content */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <ElementStatusBadge status={event.status} />
                  {event.previous_status && (
                    <span className="ml-2 text-sm text-zinc-500">
                      frá{' '}
                      <ElementStatusBadge
                        status={event.previous_status}
                        className="inline-flex"
                      />
                    </span>
                  )}
                </div>

                <time
                  dateTime={createdAt ? createdAt.toISOString() : undefined}
                  className="text-sm text-zinc-500 whitespace-nowrap"
                >
                  {createdAt
                    ? formatDistanceToNow(createdAt, { addSuffix: true, locale: is })
                    : 'Óþekkt'}
                </time>
              </div>

              {event.created_by && (
                <p className="text-sm text-zinc-600">
                  <span className="font-medium">{event.created_by.full_name}</span>
                  {' '}uppfærði stöðu
                </p>
              )}

              {event.notes && (
                <p className="text-sm text-zinc-700 bg-zinc-50 p-3 rounded-md">
                  {event.notes}
                </p>
              )}

              <p className="text-xs text-zinc-400">
                {createdAt
                  ? createdAt.toLocaleDateString('is-IS', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  : 'Óþekkt'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
