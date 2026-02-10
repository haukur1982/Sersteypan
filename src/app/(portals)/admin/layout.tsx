import DashboardLayout from '@/components/layout/DashboardLayout'
import { getServerUser } from '@/lib/auth/getServerUser'
import { dashboardPathForRole } from '@/lib/auth/rolePaths'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login?redirectTo=/admin')
  }

  if (user.role !== 'admin') {
    redirect(dashboardPathForRole(user.role))
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}
