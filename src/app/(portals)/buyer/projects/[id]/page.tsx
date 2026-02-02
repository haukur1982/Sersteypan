import { notFound } from 'next/navigation'
import { getProjectDetail, getBuyerDeliveries, getProjectFloorPlans } from '@/lib/buyer/queries'
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

  // Fetch project details, deliveries, AND floor plans for 3D view
  const [project, deliveries, floorPlans] = await Promise.all([
    getProjectDetail(id),
    getBuyerDeliveries(),
    getProjectFloorPlans(id)
  ])

  if (!project) {
    notFound()
  }

  // Filter deliveries for this project on the server
  const projectDeliveries = (deliveries || []).filter(d => d.project?.id === id)

  return (
    <ProjectDetailClient
      project={project}
      deliveries={projectDeliveries}
      floorPlans={floorPlans || []}
      tab={tab}
    />
  )
}
