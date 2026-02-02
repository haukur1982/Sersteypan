import DashboardLayout from '@/components/layout/DashboardLayout'
import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user || user.role !== 'admin') {
    // Middleware handles security, but we redirect if data missing
    redirect('/login')
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}
