import DashboardLayout from '@/components/layout/DashboardLayout'

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Middleware handles auth and role-based access
  // Sidebar/Header fetch user client-side to avoid SSR cookie timing issues
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
