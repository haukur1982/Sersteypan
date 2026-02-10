import DashboardLayout from '@/components/layout/DashboardLayout'
import { getServerUser } from '@/lib/auth/getServerUser'
import { dashboardPathForRole } from '@/lib/auth/rolePaths'
import { redirect } from 'next/navigation'

export default async function FactoryLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  // Never redirect to /login when user is null — the proxy already handles
  // unauthenticated access.  A null here is a transient cookie-timing issue,
  // and redirecting causes an infinite login loop.
  if (user && user.role !== 'factory_manager' && user.role !== 'admin') {
    redirect(dashboardPathForRole(user.role))
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}
