'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  BarChart3,
} from 'lucide-react'
import { createOverride, deleteOverride } from '@/lib/shifts/actions'
import {
  GROUP_COLORS,
  formatDateShortIS,
  getISOWeekNumber,
  isSameDay,
  OVERRIDE_TYPE_LABELS,
  formatDayNameIS,
} from '@/lib/shifts/utils'
import type { DaySchedule } from '@/lib/shifts/utils'
import type { ShiftGroupWithMembers } from '@/lib/shifts/queries'

interface Override {
  id: string
  override_date: string
  override_type: string
  reason: string | null
  member_id: string
  shift_group_members: unknown
}

interface ShiftCalendarClientProps {
  groups: ShiftGroupWithMembers[]
  weekSchedule: DaySchedule[]
  weekStart: string
  today: string
  overrides: Override[]
  view: string
  monthSummary: {
    member_id: string
    display_name: string
    group_name: string
    group_color: string
    regular_shifts: number
    extra_full: number
    extra_half: number
    absent: number
    half_days: number
    total_effective: number
  }[] | null
}

export function ShiftCalendarClient({
  groups,
  weekSchedule,
  weekStart,
  today,
  overrides,
  view: initialView,
  monthSummary,
}: ShiftCalendarClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeView, setActiveView] = useState(initialView)

  // Override dialog state
  const [showOverrideSheet, setShowOverrideSheet] = useState(false)
  const [overrideDate, setOverrideDate] = useState('')
  const [overrideMemberId, setOverrideMemberId] = useState('')
  const [overrideType, setOverrideType] = useState('extra_full')
  const [overrideReason, setOverrideReason] = useState('')

  // All members flat list for override picker
  const allMembers = groups.flatMap((g) =>
    g.members.map((m) => ({
      id: m.id,
      display_name: m.display_name,
      group_name: g.name,
      group_color: g.color,
    }))
  )

  // Build override lookup: date -> list of overrides
  const overridesByDate = new Map<string, Override[]>()
  for (const o of overrides) {
    const list = overridesByDate.get(o.override_date) || []
    list.push(o)
    overridesByDate.set(o.override_date, list)
  }

  // ─── Navigation ────────────────────────────────────────────────────────

  function navigateWeek(offset: number) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + offset * 7)
    const newWeek = d.toISOString().split('T')[0]
    router.push(`/factory/shifts?week=${newWeek}&view=${activeView}`)
  }

  function goToToday() {
    router.push(`/factory/shifts?view=${activeView}`)
  }

  function switchView(v: string) {
    setActiveView(v)
    router.push(`/factory/shifts?week=${weekStart}&view=${v}`)
  }

  // ─── Override Actions ──────────────────────────────────────────────────

  function openOverrideDialog(date?: string) {
    setOverrideDate(date || today)
    setOverrideMemberId('')
    setOverrideType('extra_full')
    setOverrideReason('')
    setShowOverrideSheet(true)
  }

  function handleCreateOverride() {
    if (!overrideMemberId || !overrideDate) {
      toast.error('Veldu starfsmann og dagsetningu')
      return
    }
    startTransition(async () => {
      const result = await createOverride(overrideMemberId, overrideDate, overrideType, overrideReason)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Undanþága skráð')
        setShowOverrideSheet(false)
        router.refresh()
      }
    })
  }

  function handleDeleteOverride(overrideId: string) {
    startTransition(async () => {
      const result = await deleteOverride(overrideId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Undanþága eytt')
        router.refresh()
      }
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const weekNumber = getISOWeekNumber(weekStart)
  const year = new Date(weekStart + 'T00:00:00').getFullYear()

  return (
    <div className="space-y-4">
      {/* View Toggle + Week Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchView('week')}
          >
            <CalendarDays className="w-4 h-4 mr-1" />
            Vika
          </Button>
          <Button
            variant={activeView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchView('month')}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Mánaðaryfirlit
          </Button>
        </div>

        {activeView === 'week' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="font-medium">
              Í dag
            </Button>
            <span className="text-sm font-medium text-zinc-700 min-w-[120px] text-center">
              Vika {weekNumber}, {year}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Week Calendar View */}
      {activeView === 'week' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {weekSchedule.map((day) => {
              const isToday = isSameDay(day.date, today)
              const dayOverrides = overridesByDate.get(day.date) || []

              // Get workers for this day's groups
              const dayGroupNames = day.groups.map((g) => g.name)
              const dayWorkers = allMembers.filter((m) => dayGroupNames.includes(m.group_name))

              // Absent workers
              const absentIds = new Set(
                dayOverrides
                  .filter((o) => o.override_type === 'absent')
                  .map((o) => o.member_id)
              )

              // Extra workers
              const extraOverrides = dayOverrides.filter(
                (o) => o.override_type === 'extra_full' || o.override_type === 'extra_half'
              )

              return (
                <Card
                  key={day.date}
                  className={`overflow-hidden transition-all ${
                    isToday
                      ? 'ring-2 ring-primary border-primary shadow-md'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`px-3 py-2 border-b ${
                      isToday ? 'bg-primary/10' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-zinc-500'}`}>
                        {formatDateShortIS(day.date)}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] px-1.5">
                          Í dag
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-3 space-y-2">
                    {/* Group badges */}
                    <div className="flex flex-wrap gap-1">
                      {day.groups.map((g) => {
                        const group = groups.find((gr) => gr.name === g.name)
                        const colors = GROUP_COLORS[group?.color || 'blue'] || GROUP_COLORS.blue
                        return (
                          <Badge
                            key={g.name}
                            variant="secondary"
                            className={`${colors.bg} ${colors.text} text-xs font-bold`}
                          >
                            {g.name}{g.isHalf ? '½' : ''}
                          </Badge>
                        )
                      })}
                      {day.groups.length === 0 && (
                        <span className="text-xs text-zinc-400 italic">Frí</span>
                      )}
                    </div>

                    {/* Worker list */}
                    {dayWorkers.length > 0 && (
                      <div className="space-y-0.5">
                        {dayWorkers.map((w) => {
                          const isAbsent = absentIds.has(w.id)
                          return (
                            <div
                              key={w.id}
                              className={`flex items-center gap-1 text-xs ${
                                isAbsent ? 'line-through opacity-50' : ''
                              }`}
                            >
                              {isAbsent ? (
                                <UserX className="w-3 h-3 text-red-400 flex-shrink-0" />
                              ) : (
                                <UserCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{w.display_name}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Extra workers from overrides */}
                    {extraOverrides.map((o) => {
                      const member = o.shift_group_members as { display_name: string } | null
                      const typeInfo = OVERRIDE_TYPE_LABELS[o.override_type]
                      return (
                        <div key={o.id} className="flex items-center gap-1 text-xs">
                          <Badge variant="secondary" className={`${typeInfo.color} text-[10px] px-1`}>
                            {typeInfo.shortLabel}
                          </Badge>
                          <span className="truncate">{member?.display_name || '?'}</span>
                          <button
                            onClick={() => handleDeleteOverride(o.id)}
                            className="ml-auto text-zinc-300 hover:text-red-500 flex-shrink-0"
                            disabled={isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}

                    {/* Absent overrides listed */}
                    {dayOverrides
                      .filter((o) => o.override_type === 'absent' || o.override_type === 'half_day')
                      .map((o) => {
                        const typeInfo = OVERRIDE_TYPE_LABELS[o.override_type]
                        return (
                          <div key={o.id} className="flex items-center gap-1 text-xs">
                            <Badge variant="secondary" className={`${typeInfo.color} text-[10px] px-1`}>
                              {typeInfo.shortLabel}
                            </Badge>
                            <span className="truncate text-zinc-500">
                              {(o.shift_group_members as { display_name: string } | null)?.display_name || '?'}
                            </span>
                            <button
                              onClick={() => handleDeleteOverride(o.id)}
                              className="ml-auto text-zinc-300 hover:text-red-500 flex-shrink-0"
                              disabled={isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}

                    {/* Add override button */}
                    <button
                      onClick={() => openOverrideDialog(day.date)}
                      className="w-full text-xs text-zinc-400 hover:text-primary hover:bg-primary/5 rounded py-1 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500 pt-2">
            {Object.entries(OVERRIDE_TYPE_LABELS).map(([key, info]) => (
              <div key={key} className="flex items-center gap-1">
                <Badge variant="secondary" className={`${info.color} text-[10px] px-1`}>
                  {info.shortLabel}
                </Badge>
                <span>{info.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Monthly Summary View */}
      {activeView === 'month' && monthSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Mánaðaryfirlit — {new Date().toLocaleDateString('is-IS', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-zinc-600">Starfsmaður</th>
                    <th className="text-left p-2 font-medium text-zinc-600">Hópur</th>
                    <th className="text-center p-2 font-medium text-zinc-600">Reglulegar</th>
                    <th className="text-center p-2 font-medium text-zinc-600">Auka</th>
                    <th className="text-center p-2 font-medium text-zinc-600">Hálfir</th>
                    <th className="text-center p-2 font-medium text-zinc-600">Fjarverur</th>
                    <th className="text-center p-2 font-medium text-zinc-600 bg-zinc-50">Samtals</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSummary.map((row) => {
                    const colors = GROUP_COLORS[row.group_color] || GROUP_COLORS.blue
                    const avgEffective = monthSummary.reduce((s, r) => s + r.total_effective, 0) / monthSummary.length
                    const isAboveAvg = row.total_effective > avgEffective * 1.15

                    return (
                      <tr key={row.member_id} className="border-b hover:bg-zinc-50">
                        <td className="p-2 font-medium">{row.display_name}</td>
                        <td className="p-2">
                          <Badge variant="secondary" className={`${colors.bg} ${colors.text} text-xs`}>
                            {row.group_name}
                          </Badge>
                        </td>
                        <td className="text-center p-2 tabular-nums">{row.regular_shifts}</td>
                        <td className="text-center p-2 tabular-nums">
                          {row.extra_full > 0 && (
                            <span className="text-green-700 font-medium">+{row.extra_full}</span>
                          )}
                          {row.extra_half > 0 && (
                            <span className="text-green-600 text-xs ml-1">+{row.extra_half}½</span>
                          )}
                          {row.extra_full === 0 && row.extra_half === 0 && '—'}
                        </td>
                        <td className="text-center p-2 tabular-nums">
                          {row.half_days > 0 ? row.half_days : '—'}
                        </td>
                        <td className="text-center p-2 tabular-nums">
                          {row.absent > 0 ? (
                            <span className="text-red-600 font-medium">{row.absent}</span>
                          ) : '—'}
                        </td>
                        <td className={`text-center p-2 tabular-nums font-bold bg-zinc-50 ${isAboveAvg ? 'text-orange-600' : ''}`}>
                          {row.total_effective}
                          {isAboveAvg && (
                            <span className="text-xs font-normal text-orange-500 ml-1" title="Yfir meðaltali">
                              !
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50 font-medium">
                    <td className="p-2" colSpan={2}>Meðaltal</td>
                    <td className="text-center p-2 tabular-nums">
                      {(monthSummary.reduce((s, r) => s + r.regular_shifts, 0) / monthSummary.length).toFixed(1)}
                    </td>
                    <td className="text-center p-2" colSpan={3}></td>
                    <td className="text-center p-2 tabular-nums bg-zinc-100">
                      {(monthSummary.reduce((s, r) => s + r.total_effective, 0) / monthSummary.length).toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'month' && !monthSummary && (
        <Card className="p-8 text-center text-zinc-500">
          Hleð mánaðaryfirliti...
        </Card>
      )}

      {/* Override Sheet */}
      <Sheet open={showOverrideSheet} onOpenChange={setShowOverrideSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Bæta við undanþágu</SheetTitle>
            <SheetDescription>
              Skráðu auka vakt, fjarvist eða hálfan dag.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <Label>Dagsetning</Label>
              <Input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="mt-1"
              />
              {overrideDate && (
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDayNameIS(overrideDate)}, {formatDateShortIS(overrideDate)}
                </p>
              )}
            </div>

            <div>
              <Label>Starfsmaður</Label>
              <Select value={overrideMemberId} onValueChange={setOverrideMemberId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Veldu starfsmann..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => {
                    const colors = GROUP_COLORS[g.color] || GROUP_COLORS.blue
                    return g.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          {m.display_name}
                          <span className="text-zinc-400 text-xs">({g.name})</span>
                        </span>
                      </SelectItem>
                    ))
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tegund</Label>
              <Select value={overrideType} onValueChange={setOverrideType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OVERRIDE_TYPE_LABELS).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className={`${info.color} text-xs px-1`}>
                          {info.shortLabel}
                        </Badge>
                        {info.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ástæða (valfrjálst)</Label>
              <Input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="T.d. mikil vinna, veikindi..."
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleCreateOverride}
              disabled={isPending || !overrideMemberId || !overrideDate}
              className="w-full"
            >
              {isPending ? 'Vista...' : 'Skrá undanþágu'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
