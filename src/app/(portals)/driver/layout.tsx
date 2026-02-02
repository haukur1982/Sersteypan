import DashboardLayout from '@/components/layout/DashboardLayout'
import { OfflineBanner } from '@/components/driver/OfflineBanner'

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware handles auth and role-based access
  // Sidebar/Header fetch user client-side to avoid SSR cookie timing issues
  return (
    <DashboardLayout>
      <OfflineBanner />
      {children}
    </DashboardLayout>
  )
}
