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

  // Do not redirect on null user here. Middleware handles unauthenticated access.
  // getServerUser() can be null transiently (cookie timing / profile read), and redirecting
  // causes the "login loop" symptom you saw.
  if (user && user.role !== 'admin') {
    redirect(dashboardPathForRole(user.role))
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}
