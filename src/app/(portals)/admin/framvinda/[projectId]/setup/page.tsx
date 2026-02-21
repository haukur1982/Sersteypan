import {
  getContract,
  getContractLines,
  getProjectForFramvinda,
  getProjectBuildings,
  getProjectElements,
  getProjectDeliveries,
} from '@/lib/framvinda/queries'
import { redirect } from 'next/navigation'
import { ContractSetupClient } from './ContractSetupClient'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ContractSetupPage({ params }: PageProps) {
  const { projectId } = await params
  const project = await getProjectForFramvinda(projectId)

  if (!project) redirect('/admin/framvinda')

  const contract = await getContract(projectId)
  const existingLines = contract ? await getContractLines(contract.id, null) : []

  // Fetch data for auto-suggest
  const [buildings, elements, deliveries] = await Promise.all([
    getProjectBuildings(projectId),
    getProjectElements(projectId),
    getProjectDeliveries(projectId),
  ])

  const companyName =
    (project.companies as { name: string; kennitala: string } | null)?.name ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {contract ? 'Breyta samningi' : 'Setja upp samning'}
        </h1>
        <p className="text-zinc-600 mt-1">
          {project.name} — {companyName}
        </p>
      </div>

      <ContractSetupClient
        projectId={projectId}
        contract={contract}
        existingLines={existingLines}
        isFrozen={contract?.is_frozen ?? false}
        buildings={buildings}
        elements={elements}
        deliveries={deliveries}
      />
    </div>
  )
}
