import { getUser } from '@/lib/auth/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function FactoryLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Middleware handles auth and role-based access
  // Layout just fetches user for rendering purposes
  const user = await getUser()

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}
