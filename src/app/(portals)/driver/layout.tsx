import DashboardLayout from '@/components/layout/DashboardLayout'
import { OfflineBanner } from '@/components/driver/OfflineBanner'
import { getServerUser } from '@/lib/auth/getServerUser'
import { dashboardPathForRole } from '@/lib/auth/rolePaths'
import { redirect } from 'next/navigation'

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login?redirectTo=/driver')
  }

  // Allow admins to inspect all portals.
  if (user.role !== 'driver' && user.role !== 'admin') {
    redirect(dashboardPathForRole(user.role))
  }

  return (
    <DashboardLayout user={user}>
      <OfflineBanner />
      {children}
    </DashboardLayout>
  )
}
