import { getServerUser } from '@/lib/auth/getServerUser'
import { getReportData } from '@/lib/admin/reportQueries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { ReportsClient } from './ReportsClient'

interface ReportsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()

  switch (period) {
    case '7d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 7)
      return { from: from.toISOString(), to }
    }
    case '30d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { from: from.toISOString(), to }
    }
    case '90d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 90)
      return { from: from.toISOString(), to }
    }
    case 'all': {
      // Go back ~3 years — effectively "all time"
      const from = new Date('2022-01-01T00:00:00Z')
      return { from: from.toISOString(), to }
    }
    default: {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { from: from.toISOString(), to }
    }
  }
}

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getServerUser()
  if (user && user.role !== 'admin') {
    redirect('/admin')
  }

  const params = await searchParams
  const period = typeof params.period === 'string' ? params.period : '30d'
  const dateRange = getDateRange(period)

  const data = await getReportData(dateRange)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-zinc-700" />
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Skýrslur (Reports)
            </h1>
          </div>
        </div>
        <p className="ml-12 text-sm text-zinc-600">
          Lykiltölur úr verksmiðjunni
        </p>
      </div>

      <ReportsClient data={data} />
    </div>
  )
}
