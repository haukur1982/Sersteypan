import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function DriverDashboard() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'driver') {
    redirect('/login')
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
            <p className="text-3xl font-semibold text-zinc-900 mt-2">-</p>
            <p className="text-xs text-zinc-600 mt-1">Today&apos;s Deliveries</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-zinc-500">Hlaðið</h3>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">-</p>
            <p className="text-xs text-zinc-600 mt-1">Loaded Items</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-zinc-500">Afhent</h3>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">-</p>
            <p className="text-xs text-zinc-600 mt-1">Delivered Items</p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-2">
            🚧 Virkni kemur bráðlega
          </h2>
          <p className="text-purple-800">
            Functionality coming soon. Full driver portal will be built in Phase 6.
          </p>
          <div className="mt-4 text-sm text-purple-700">
            <p><strong>Your Info:</strong></p>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
