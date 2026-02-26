'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  UserPlus,
  X,
  Save,
  Eye,
} from 'lucide-react'
import { Info } from 'lucide-react'
import { addGroupMember, removeGroupMember, saveShiftPattern, addShiftGroup } from '@/lib/shifts/actions'
import { GROUP_COLORS, getScheduledGroupsForDate, formatDateShortIS } from '@/lib/shifts/utils'
import type { ShiftGroupWithMembers } from '@/lib/shifts/queries'

const WEEKDAY_NAMES_SHORT = ['sun.', 'mán.', 'þri.', 'mið.', 'fim.', 'fös.', 'lau.']
const WEEKDAY_NAMES_FULL = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur']

interface ShiftSetupClientProps {
  initialGroups: ShiftGroupWithMembers[]
  initialPattern: {
    start_date: string
    cycle_days: number
    pattern: string[][]
  } | null
}

export function ShiftSetupClient({ initialGroups, initialPattern }: ShiftSetupClientProps) {
  const [groups, setGroups] = useState(initialGroups)
  const [isPending, startTransition] = useTransition()

  // New member input state per group
  const [newMemberNames, setNewMemberNames] = useState<Record<string, string>>({})

  // Pattern state
  const [startDate, setStartDate] = useState(initialPattern?.start_date || '')
  const [cycleDays, setCycleDays] = useState(initialPattern?.cycle_days || 14)
  const [pattern, setPattern] = useState<string[][]>(
    initialPattern?.pattern || Array.from({ length: 14 }, () => [])
  )

  // New group input
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)

  const colorOptions = ['blue', 'green', 'amber', 'purple', 'red', 'cyan', 'pink', 'orange']

  // ─── Group Actions ───────────────────────────────────────────────────────

  function handleAddGroup() {
    if (!newGroupName.trim()) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('name', newGroupName.trim())
      // Pick a color not used by existing groups
      const usedColors = groups.map((g) => g.color)
      const color = colorOptions.find((c) => !usedColors.includes(c)) || 'blue'
      formData.set('color', color)

      const result = await addShiftGroup({ error: '' }, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Hópur ${newGroupName.trim()} búinn til`)
        setNewGroupName('')
        setShowNewGroup(false)
        // Reload page to get new data
        window.location.reload()
      }
    })
  }

  // ─── Member Actions ──────────────────────────────────────────────────────

  function handleAddMember(groupId: string) {
    const name = newMemberNames[groupId]?.trim()
    if (!name) return
    startTransition(async () => {
      const result = await addGroupMember(groupId, name)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${name} bætt í hóp`)
        setNewMemberNames((prev) => ({ ...prev, [groupId]: '' }))
        // Update local state optimistically
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, members: [...g.members, { id: crypto.randomUUID(), display_name: name, is_active: true, profile_id: null }] }
              : g
          )
        )
      }
    })
  }

  function handleRemoveMember(memberId: string, groupId: string) {
    startTransition(async () => {
      const result = await removeGroupMember(memberId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Meðlimur fjarlægður')
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
              : g
          )
        )
      }
    })
  }

  // ─── Pattern Actions ─────────────────────────────────────────────────────

  function handleCycleDaysChange(newDays: number) {
    if (newDays < 1 || newDays > 60) return
    setCycleDays(newDays)
    setPattern((prev) => {
      if (newDays > prev.length) {
        return [...prev, ...Array.from({ length: newDays - prev.length }, () => [])]
      }
      return prev.slice(0, newDays)
    })
  }

  function toggleGroupInDay(dayIndex: number, groupName: string) {
    setPattern((prev) => {
      const newPattern = [...prev]
      const day = [...(newPattern[dayIndex] || [])]
      const plainNames = day.map((e) => e.replace(/-$/, ''))
      const idx = plainNames.indexOf(groupName)
      if (idx >= 0) {
        day.splice(idx, 1)
      } else {
        day.push(groupName)
      }
      newPattern[dayIndex] = day
      return newPattern
    })
  }

  function toggleHalfDay(dayIndex: number, groupName: string) {
    setPattern((prev) => {
      const newPattern = [...prev]
      const day = [...(newPattern[dayIndex] || [])]
      const idx = day.findIndex((e) => e.replace(/-$/, '') === groupName)
      if (idx >= 0) {
        day[idx] = day[idx].endsWith('-') ? groupName : groupName + '-'
        newPattern[dayIndex] = day
      }
      return newPattern
    })
  }

  function handleSavePattern() {
    if (!startDate) {
      toast.error('Veldu upphafsdagsetningu')
      return
    }
    startTransition(async () => {
      const result = await saveShiftPattern(startDate, cycleDays, pattern)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Vaktamynstur vistað!')
      }
    })
  }

  // ─── Weekday helpers for pattern grid ────────────────────────────────────

  function getWeekdayForPatternDay(dayIndex: number): { name: string; fullName: string; isMonday: boolean; weekNum: number } | null {
    if (!startDate) return null
    const start = new Date(startDate + 'T00:00:00')
    const d = new Date(start)
    d.setDate(d.getDate() + dayIndex)
    const dayOfWeek = d.getDay()
    return {
      name: WEEKDAY_NAMES_SHORT[dayOfWeek],
      fullName: WEEKDAY_NAMES_FULL[dayOfWeek],
      isMonday: dayOfWeek === 1,
      weekNum: Math.floor(dayIndex / 7) + 1,
    }
  }

  // ─── Pattern Preview ─────────────────────────────────────────────────────

  function getPreviewDays(): { date: string; label: string; groups: { name: string; isHalf: boolean }[] }[] {
    if (!startDate || pattern.length === 0) return []
    const today = new Date()
    const days: { date: string; label: string; groups: { name: string; isHalf: boolean }[] }[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const groups = getScheduledGroupsForDate(pattern, startDate, cycleDays, dateStr)
      days.push({ date: dateStr, label: formatDateShortIS(dateStr), groups })
    }
    return days
  }

  return (
    <div className="space-y-6">
      {/* ─── Shift Groups ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Vaktahópar</CardTitle>
            {!showNewGroup && (
              <Button variant="outline" size="sm" onClick={() => setShowNewGroup(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nýr hópur
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showNewGroup && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-50 rounded-lg">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nafn hóps (t.d. E)"
                className="max-w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
              />
              <Button size="sm" onClick={handleAddGroup} disabled={isPending}>
                <Plus className="w-4 h-4 mr-1" /> Bæta við
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewGroup(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groups.map((group) => {
              const colors = GROUP_COLORS[group.color] || GROUP_COLORS.blue
              return (
                <div
                  key={group.id}
                  className={`rounded-lg border-2 p-4 ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold text-lg ${colors.text}`}>
                      Hópur {group.name}
                    </h3>
                    <Badge variant="secondary" className={`${colors.bg} ${colors.text}`}>
                      {group.members.length}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {group.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-1 px-2 bg-white/60 rounded"
                      >
                        <span className="text-sm font-medium">{member.display_name}</span>
                        <button
                          onClick={() => handleRemoveMember(member.id, group.id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                          disabled={isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newMemberNames[group.id] || ''}
                      onChange={(e) =>
                        setNewMemberNames((prev) => ({ ...prev, [group.id]: e.target.value }))
                      }
                      placeholder="Nafn..."
                      className="text-sm h-8 bg-white/80"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMember(group.id)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => handleAddMember(group.id)}
                      disabled={isPending}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {groups.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              Engir hópar skilgreindir. Smelltu á &quot;Nýr hópur&quot; til að byrja.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Rotation Pattern ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vaktamynstur</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">
            Smelltu á hóp til að kveikja/slökkva á honum þann dag. Mynstrið endurtekur sig sjálfkrafa.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-sm font-medium">Upphafsdagsetning</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[180px] mt-1"
              />
              <p className="text-xs text-zinc-500 mt-1">Fyrsti dagur mynstursins</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Dagar í lotu</Label>
              <Input
                type="number"
                value={cycleDays}
                onChange={(e) => handleCycleDaysChange(parseInt(e.target.value) || 1)}
                className="w-[100px] mt-1"
                min={1}
                max={60}
              />
              <p className="text-xs text-zinc-500 mt-1">
                {cycleDays % 7 === 0 ? `${cycleDays / 7} ${cycleDays / 7 === 1 ? 'vika' : 'vikur'}` : `${cycleDays} dagar`}
              </p>
            </div>
          </div>

          {startDate && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Mynstrið byrjar {formatDateShortIS(startDate)} og endurtekur sig á{' '}
                {cycleDays % 7 === 0 ? `${cycleDays / 7} vikna` : `${cycleDays} daga`} fresti.
              </span>
            </div>
          )}

          {/* Pattern grid editor */}
          {groups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b font-medium text-zinc-600 w-32">Dagur</th>
                    {groups.map((g) => {
                      const colors = GROUP_COLORS[g.color] || GROUP_COLORS.blue
                      return (
                        <th key={g.id} className="p-2 border-b text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${colors.bg} ${colors.text} font-bold`}>
                              {g.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-normal">
                              {g.members.length} manns
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pattern.map((day, dayIdx) => {
                    const weekday = getWeekdayForPatternDay(dayIdx)
                    const showWeekSeparator = weekday && weekday.isMonday && dayIdx > 0

                    return (
                      <tr
                        key={dayIdx}
                        className={`hover:bg-zinc-50 ${showWeekSeparator ? 'border-t-2 border-t-zinc-300' : ''}`}
                      >
                        <td className={`p-2 border-b ${showWeekSeparator ? 'pt-3' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-400 w-5 text-right text-xs">{dayIdx + 1}</span>
                            {weekday ? (
                              <span
                                className={`text-sm ${
                                  weekday.fullName === 'laugardagur' || weekday.fullName === 'sunnudagur'
                                    ? 'text-zinc-400'
                                    : 'text-zinc-700 font-medium'
                                }`}
                                title={weekday.fullName}
                              >
                                {weekday.name}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-sm">—</span>
                            )}
                            {showWeekSeparator && (
                              <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 text-[10px] px-1.5 py-0">
                                Vika {weekday.weekNum}
                              </Badge>
                            )}
                            {weekday && dayIdx === 0 && (
                              <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 text-[10px] px-1.5 py-0">
                                Vika 1
                              </Badge>
                            )}
                          </div>
                        </td>
                        {groups.map((g) => {
                          const isOn = day.some((e) => e.replace(/-$/, '') === g.name)
                          const isHalf = day.some((e) => e === g.name + '-')
                          const colors = GROUP_COLORS[g.color] || GROUP_COLORS.blue
                          const isWeekend = weekday && (weekday.fullName === 'laugardagur' || weekday.fullName === 'sunnudagur')

                          return (
                            <td key={g.id} className={`p-2 border-b text-center ${isWeekend ? 'bg-zinc-50/50' : ''} ${showWeekSeparator ? 'pt-3' : ''}`}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => toggleGroupInDay(dayIdx, g.name)}
                                  className={`w-8 h-8 rounded-md border-2 transition-all font-bold text-xs ${
                                    isOn
                                      ? `${colors.bg} ${colors.border} ${colors.text}`
                                      : 'border-zinc-200 text-zinc-300 hover:border-zinc-400'
                                  }`}
                                >
                                  {isOn ? g.name : ''}
                                </button>
                                {isOn && (
                                  <button
                                    onClick={() => toggleHalfDay(dayIdx, g.name)}
                                    className={`text-xs px-1.5 py-0.5 rounded transition-all ${
                                      isHalf
                                        ? 'bg-yellow-200 text-yellow-800 font-bold'
                                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                                    }`}
                                    title={isHalf ? 'Hálfur dagur (smella til að taka af)' : 'Smella fyrir hálfan dag'}
                                  >
                                    ½
                                  </button>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Button
            onClick={handleSavePattern}
            disabled={isPending || !startDate || groups.length === 0}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {isPending ? 'Vista...' : 'Vista mynstur'}
          </Button>
        </CardContent>
      </Card>

      {/* ─── Preview ─────────────────────────────────────────────────── */}
      {startDate && groups.length > 0 && pattern.some((d) => d.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Forskoðun (næstu 14 dagar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {getPreviewDays().map((day) => {
                const isToday = day.date === new Date().toISOString().split('T')[0]
                return (
                  <div
                    key={day.date}
                    className={`rounded-lg border p-2 text-center ${
                      isToday ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-zinc-200'
                    }`}
                  >
                    <p className="text-xs font-medium text-zinc-600 mb-1">{day.label}</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {day.groups.map((g, i) => {
                        const group = groups.find((gr) => gr.name === g.name)
                        const colors = GROUP_COLORS[group?.color || 'blue'] || GROUP_COLORS.blue
                        return (
                          <Badge
                            key={i}
                            variant="secondary"
                            className={`${colors.bg} ${colors.text} text-xs`}
                          >
                            {g.name}{g.isHalf ? '½' : ''}
                          </Badge>
                        )
                      })}
                      {day.groups.length === 0 && (
                        <span className="text-xs text-zinc-400">Frí</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
