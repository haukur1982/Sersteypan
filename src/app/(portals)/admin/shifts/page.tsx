import { getShiftGroups, getActivePattern, getOverridesForRange, getMonthSummary } from '@/lib/shifts/queries'
import { getMonday, getWeekSchedule, getTodayISO } from '@/lib/shifts/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { ShiftCalendarClient } from './ShiftCalendarClient'

interface PageProps {
  searchParams: Promise<{ week?: string; view?: string }>
}

export default async function ShiftsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const today = getTodayISO()
  const weekParam = params.week || today
  const weekStart = getMonday(weekParam)
  const view = params.view || 'week'

  const [groups, pattern, overrides] = await Promise.all([
    getShiftGroups(),
    getActivePattern(),
    getOverridesForRange(
      weekStart,
      (() => {
        const d = new Date(weekStart + 'T00:00:00')
        d.setDate(d.getDate() + 6)
        return d.toISOString().split('T')[0]
      })()
    ),
  ])

  const weekSchedule = pattern
    ? getWeekSchedule(
        pattern.pattern as string[][],
        pattern.start_date,
        pattern.cycle_days,
        weekStart
      )
    : []

  // Get month summary if in month view
  const now = new Date(today + 'T00:00:00')
  const monthSummary = view === 'month'
    ? await getMonthSummary(now.getFullYear(), now.getMonth() + 1)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Vaktaplan
            </h1>
            <p className="text-sm text-zinc-600 mt-0.5">
              {groups.length} hópar &middot; {groups.reduce((sum, g) => sum + g.members.length, 0)} starfsmenn
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/shifts/setup">
            <Settings className="w-4 h-4 mr-2" />
            Uppsetning
          </Link>
        </Button>
      </div>

      {!pattern ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-4">Ekkert vaktamynstur uppsett ennþá.</p>
          <Button asChild>
            <Link href="/admin/shifts/setup">Setja upp vaktaplan</Link>
          </Button>
        </div>
      ) : (
        <ShiftCalendarClient
          groups={groups}
          weekSchedule={weekSchedule}
          weekStart={weekStart}
          today={today}
          overrides={overrides}
          view={view}
          monthSummary={monthSummary}
        />
      )}
    </div>
  )
}
