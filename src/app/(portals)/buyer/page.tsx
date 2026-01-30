import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { getBuyerProjects, getBuyerDeliveries } from '@/lib/buyer/queries'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { BuyerDashboardClient } from '@/components/buyer/BuyerDashboardClient'

export default async function BuyerDashboard() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'buyer') {
    redirect('/login')
  }

  // Fetch buyer's data
  const [projects, deliveries] = await Promise.all([
    getBuyerProjects(),
    getBuyerDeliveries()
  ])

  return (
    <DashboardLayout>
      <BuyerDashboardClient
        user={{
          fullName: user.fullName
        }}
        initialProjects={projects}
        initialDeliveries={deliveries}
      />
    </DashboardLayout>
  )
}
