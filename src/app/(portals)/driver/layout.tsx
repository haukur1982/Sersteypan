import { getUser } from '@/lib/auth/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { OfflineBanner } from '@/components/driver/OfflineBanner'

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware handles auth and role-based access
  // Layout just fetches user for rendering purposes
  const user = await getUser()

  return (
    <DashboardLayout user={user}>
      <OfflineBanner />
      {children}
    </DashboardLayout>
  )
}
