import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDriverDeliveries } from '@/lib/driver/queries'
import { DriverDeliveryList } from '@/components/driver/DriverDeliveryList'

export default async function DriverDashboard() {
  const user = await getUser()

  // Middleware controls portal access. Don't bounce admins (they can review all portals),
  // and don't send authenticated users back to /login (looks like a logout).
  if (!user) {
    redirect('/login')
  }
  if (user.role !== 'driver' && user.role !== 'admin') {
    redirect(`/${user.role === 'factory_manager' ? 'factory' : user.role}`)
  }

  const deliveries = await getDriverDeliveries()

  const stats = {
    today: deliveries.filter(d => d.planned_date && isToday(new Date(d.planned_date))).length,
    inTransit: deliveries.filter(d => d.status === 'in_transit').length,
    completed: deliveries.filter(d => d.status === 'delivered').length
  }

  function isToday(date: Date) {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Mobile-first Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Bílstjórastjórnborð
          </h1>
          <p className="text-zinc-600 mt-1">
            Velkomin, {user?.fullName || ''}
          </p>
        </div>

        {/* Primary Action - Big Scan Button */}
        <Button
          asChild
          size="lg"
          className="w-full h-16 text-lg shadow-lg bg-blue-600 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Link href="/driver/scan" className="flex items-center justify-center gap-3">
            <QrCode className="w-6 h-6" />
            SKANNA QR KÓÐA
          </Link>
        </Button>
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
  )
}
