import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getDriverDeliveries } from '@/lib/driver/queries'
import { DriverDeliveryList } from '@/components/driver/DriverDeliveryList'

export default async function DriverDashboard() {
  const user = await getUser()

  if (!user || user.role !== 'driver') {
    redirect('/login')
  }

  const deliveries = await getDriverDeliveries()

  const stats = {
    today: deliveries.filter(d => {
      const today = new Date().toISOString().split('T')[0]
      return d.planned_date?.startsWith(today)
    }).length,
    inTransit: deliveries.filter(d => d.status === 'in_transit' || d.status === 'arrived').length,
    completed: deliveries.filter(d => d.status === 'completed').length
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Bílstjórastjórnborð
          </h1>
          <p className="text-zinc-600 mt-1">
            Velkomin, {user.fullName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-zinc-500">Afhendingar í dag</h3>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">{stats.today}</p>
            <p className="text-xs text-zinc-600 mt-1">Today&apos;s Deliveries</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-zinc-500">Í vinnslu</h3>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">{stats.inTransit}</p>
            <p className="text-xs text-zinc-600 mt-1">Active Deliveries</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-zinc-500">Afhent</h3>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">{stats.completed}</p>
            <p className="text-xs text-zinc-600 mt-1">Delivered Items</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900">Mínar afhendingar</h2>
          <DriverDeliveryList deliveries={deliveries} />
        </div>
      </div>
    </DashboardLayout>
  )
}
