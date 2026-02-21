import {
  getContract,
  getContractLines,
  getPeriod,
  getPeriodLines,
  getCumulativeBeforePeriod,
  getProjectForFramvinda,
  getProjectElements,
  getProjectDeliveries,
} from '@/lib/framvinda/queries'
import { redirect } from 'next/navigation'
import { FramvindaEditorClient } from './FramvindaEditorClient'

interface PageProps {
  params: Promise<{ projectId: string; periodId: string }>
}

export default async function FramvindaPeriodPage({ params }: PageProps) {
  const { projectId, periodId } = await params
  const project = await getProjectForFramvinda(projectId)

  if (!project) redirect('/admin/framvinda')

  const contract = await getContract(projectId)
  if (!contract) redirect(`/admin/framvinda/${projectId}/setup`)

  const [contractLines, period, periodLines] = await Promise.all([
    getContractLines(contract.id),
    getPeriod(periodId),
    getPeriodLines(periodId),
  ])

  if (!period) redirect(`/admin/framvinda/${projectId}`)

  // Get cumulative data from prior finalized periods
  const cumulativeMap = await getCumulativeBeforePeriod(
    contract.id,
    period.period_number
  )

  // Get elements/deliveries for auto-suggest
  const [elements, deliveries] = await Promise.all([
    getProjectElements(projectId),
    getProjectDeliveries(projectId),
  ])

  const companyName =
    (project.companies as { name: string; kennitala: string } | null)?.name ?? ''

  // Convert cumulative map to plain object for serialization
  const cumulativeBefore: Record<string, number> = {}
  for (const [key, value] of cumulativeMap) {
    cumulativeBefore[key] = value
  }

  return (
    <FramvindaEditorClient
      projectId={projectId}
      projectName={project.name}
      companyName={companyName}
      contract={contract}
      contractLines={contractLines}
      period={period}
      periodLines={periodLines}
      cumulativeBefore={cumulativeBefore}
      elements={elements}
      deliveries={deliveries}
    />
  )
}
