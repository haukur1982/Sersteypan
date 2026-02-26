import { getShiftGroups, getActivePattern } from '@/lib/shifts/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { ShiftSetupClient } from './ShiftSetupClient'

export default async function ShiftSetupPage() {
  const [groups, pattern] = await Promise.all([
    getShiftGroups(),
    getActivePattern(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/shifts">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Uppsetning vaktaplans
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Skilgreindu hópa, meðlimi og vaktamynstur
          </p>
        </div>
      </div>

      <ShiftSetupClient
        initialGroups={groups}
        initialPattern={pattern ? {
          start_date: pattern.start_date,
          cycle_days: pattern.cycle_days,
          pattern: pattern.pattern as string[][],
        } : null}
      />
    </div>
  )
}
