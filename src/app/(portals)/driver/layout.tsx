import DashboardLayout from '@/components/layout/DashboardLayout'
import { OfflineBanner } from '@/components/driver/OfflineBanner'
import { getUser } from '@/lib/auth/actions'

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  return (
    <DashboardLayout user={user || undefined}>
      <OfflineBanner />
      {children}
    </DashboardLayout>
  )
}
