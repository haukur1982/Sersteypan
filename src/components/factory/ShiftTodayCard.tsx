import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CalendarClock, ArrowRight, UserCheck, UserX, Plus } from 'lucide-react'
import { GROUP_COLORS, formatDateShortIS, formatDayNameIS, OVERRIDE_TYPE_LABELS } from '@/lib/shifts/utils'
import type { DayGroupEntry, ShiftMember } from '@/lib/shifts/utils'

interface ShiftTodayCardProps {
  today: string
  todayGroups: DayGroupEntry[]
  workers: ShiftMember[]
  overrides: {
    member_id: string
    display_name: string
    override_type: string
    reason: string | null
  }[]
  hasPattern: boolean
  tomorrowGroups: DayGroupEntry[]
  groups: { name: string; color: string; members: { id: string; display_name: string }[] }[]
}

export function ShiftTodayCard({
  today,
  todayGroups,
  workers,
  overrides,
  hasPattern,
  tomorrowGroups,
  groups,
}: ShiftTodayCardProps) {
  if (!hasPattern) {
    return (
      <Card className="p-6 border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-zinc-500" />
            Vaktaplan
          </h2>
        </div>
        <p className="text-sm text-zinc-500 mb-4">Ekkert vaktamynstur uppsett ennþá.</p>
        <Link
          href="/factory/shifts/setup"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Setja upp vaktaplan <ArrowRight className="w-4 h-4" />
        </Link>
      </Card>
    )
  }

  // Workers absent today
  const absentMemberIds = new Set(
    overrides.filter((o) => o.override_type === 'absent').map((o) => o.member_id)
  )

  // Extra workers today
  const extraWorkers = overrides.filter(
    (o) => o.override_type === 'extra_full' || o.override_type === 'extra_half'
  )

  // Count effective headcount
  const scheduledWorkers = workers.filter((w) => !absentMemberIds.has(w.id))
  const headcount = scheduledWorkers.length + extraWorkers.length

  return (
    <Card className="p-6 border-zinc-200 bg-gradient-to-br from-blue-50/30 to-purple-50/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          Á vakt í dag
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
            {headcount} manns
          </Badge>
          <span className="text-sm text-zinc-500">{formatDateShortIS(today)}</span>
        </div>
      </div>

      {/* Today's groups with workers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {todayGroups.map((groupEntry) => {
          const group = groups.find((g) => g.name === groupEntry.name)
          const colors = GROUP_COLORS[group?.color || 'blue'] || GROUP_COLORS.blue
          const groupWorkers = workers.filter(
            (w) => w.group_name === groupEntry.name && !absentMemberIds.has(w.id)
          )
          const absentFromGroup = workers.filter(
            (w) => w.group_name === groupEntry.name && absentMemberIds.has(w.id)
          )

          return (
            <div
              key={groupEntry.name}
              className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <span className={`font-bold ${colors.text}`}>
                  Hópur {groupEntry.name}
                </span>
                {groupEntry.isHalf && (
                  <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 text-xs">
                    ½ dagur
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5">
                {groupWorkers.map((w) => (
                  <div key={w.id} className="flex items-center gap-1.5 text-sm">
                    <UserCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span>{w.display_name}</span>
                  </div>
                ))}
                {absentFromGroup.map((w) => (
                  <div key={w.id} className="flex items-center gap-1.5 text-sm line-through opacity-60">
                    <UserX className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span>{w.display_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Overrides summary */}
      {(extraWorkers.length > 0 || absentMemberIds.size > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {extraWorkers.map((o) => {
            const typeInfo = OVERRIDE_TYPE_LABELS[o.override_type] || OVERRIDE_TYPE_LABELS.extra_full
            return (
              <Badge key={o.member_id} variant="secondary" className={`${typeInfo.color} text-xs`}>
                <Plus className="w-3 h-3 mr-1" />
                {o.display_name}
                {o.override_type === 'extra_half' ? ' (½)' : ''}
              </Badge>
            )
          })}
        </div>
      )}

      {/* Tomorrow preview + link */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-200/60">
        <div className="text-sm text-zinc-600">
          <span className="text-zinc-400">Á morgun:</span>{' '}
          {tomorrowGroups.map((g) => {
            const group = groups.find((gr) => gr.name === g.name)
            const colors = GROUP_COLORS[group?.color || 'blue'] || GROUP_COLORS.blue
            return (
              <Badge
                key={g.name}
                variant="secondary"
                className={`${colors.bg} ${colors.text} text-xs mr-1`}
              >
                {g.name}{g.isHalf ? '½' : ''}
              </Badge>
            )
          })}
        </div>
        <Link
          href="/factory/shifts"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Sjá vaktaplan <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Card>
  )
}
