import { getContract } from '@/lib/framvinda/queries'
import { redirect } from 'next/navigation'
import { NewRevisionClient } from './NewRevisionClient'

interface PageProps {
    params: Promise<{ projectId: string }>
}

export default async function NewRevisionPage({ params }: PageProps) {
    const { projectId } = await params
    const contract = await getContract(projectId)

    if (!contract || !contract.is_frozen) {
        redirect(`/admin/framvinda/${projectId}`)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                    Stofna Viðbót (Change Order)
                </h1>
                <p className="text-zinc-600 mt-1">
                    Ný viðbót við samning sem tekur gildi í næstu framvindu.
                </p>
            </div>

            <div className="max-w-xl">
                <NewRevisionClient contractId={contract.id} projectId={projectId} />
            </div>
        </div>
    )
}
