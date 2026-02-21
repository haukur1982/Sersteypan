import { getContract, getContractLines } from '@/lib/framvinda/queries'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RevisionSetupClient } from './RevisionSetupClient'

interface PageProps {
    params: Promise<{ projectId: string; revisionId: string }>
}

export default async function RevisionSetupPage({ params }: PageProps) {
    const { projectId, revisionId } = await params

    const supabase = await createClient()
    const { data: revision } = await supabase
        .from('framvinda_contract_revisions')
        .select('*')
        .eq('id', revisionId)
        .single()

    if (!revision) redirect(`/admin/framvinda/${projectId}`)

    const contract = await getContract(projectId)
    if (!contract) redirect(`/admin/framvinda/${projectId}`)

    // Get only lines for this revision
    const existingLines = await getContractLines(contract.id, revisionId)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                    Viðbót: {revision.name}
                </h1>
                <p className="text-zinc-600 mt-1">
                    Bættu við auka samningslínum fyrir þessa viðbót.
                </p>
            </div>

            <RevisionSetupClient
                projectId={projectId}
                contractId={contract.id}
                revision={revision}
                existingLines={existingLines}
            />
        </div>
    )
}
