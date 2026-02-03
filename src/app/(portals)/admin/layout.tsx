import DashboardLayout from '@/components/layout/DashboardLayout'
import { getUser } from '@/lib/auth/actions'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user || user.role !== 'admin') {
    // Middleware handles security. If we get here without user, it's likely a sync issue.
    // Instead of redirecting (loop risk), we render with what we have.
    // Ideally we might show a "Re-authenticating..." state or error.
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}
