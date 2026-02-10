import { getServerUser } from '@/lib/auth/getServerUser'
import { getBuyerProjects, getBuyerDeliveries } from '@/lib/buyer/queries'
import { BuyerDashboardClient } from '@/components/buyer/BuyerDashboardClient'

export default async function BuyerDashboard() {
  const user = await getServerUser()

  // Fetch buyer's data
  const [projects, deliveries] = await Promise.all([
    getBuyerProjects(),
    getBuyerDeliveries()
  ])

  return (
    <BuyerDashboardClient
      user={{
        fullName: user?.fullName || ''
      }}
      initialProjects={projects}
      initialDeliveries={deliveries}
    />
  )
}
