import { getUser } from '@/lib/auth/actions'
import { redirect, notFound } from 'next/navigation'
import { getProjectDetail, getBuyerDeliveries } from '@/lib/buyer/queries'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProjectDetailClient } from '@/components/buyer/ProjectDetailClient'

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'buyer') {
    redirect('/login')
  }

  const [project, deliveries] = await Promise.all([
    getProjectDetail(id),
    getBuyerDeliveries() // Or a more specific query if available
  ])

  if (!project) {
    notFound()
  }

  // Filter deliveries for this project on the server
  const projectDeliveries = (deliveries || []).filter(d => d.project?.id === id)

  return (
    <DashboardLayout>
      <ProjectDetailClient
        project={project}
        deliveries={projectDeliveries}
        tab={tab}
      />
    </DashboardLayout>
  )
}
