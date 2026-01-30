import { getUser } from '@/lib/auth/actions'
import { redirect, notFound } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { DeliverPageClient } from './DeliverPageClient'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
    title: 'Staðfesta afhendingu | Sérsteypan',
    description: 'Staðfestu afhendingu með undirskrift og mynd',
}

interface DeliverPageProps {
    params: Promise<{ id: string }>
}

export default async function DeliverPage({ params }: DeliverPageProps) {
    const user = await getUser()

    if (!user || user.role !== 'driver') {
        redirect('/login')
    }

    const { id } = await params
    const supabase = await createClient()

    // Fetch delivery with elements
    const { data: delivery, error } = await supabase
        .from('deliveries')
        .select(`
      id,
      status,
      project:projects(
        id,
        name,
        company:companies(name),
        address
      ),
      delivery_items(
        element:elements(
          id,
          name,
          status
        )
      )
    `)
        .eq('id', id)
        .single()

    if (error || !delivery) {
        notFound()
    }

    // Only allow confirmation for in-progress deliveries
    if (delivery.status === 'completed') {
        redirect(`/driver/deliveries/${id}`)
    }

    // Extract elements from delivery items
    const elements = delivery.delivery_items
        .map((item) => item.element)
        .filter((e): e is { id: string; name: string; status: string | null } => e !== null)
        .map((e) => ({ ...e, status: e.status || 'planned' }))

    const project = delivery.project as {
        id: string
        name: string
        company: { name: string } | null
        address: string | null
    } | null

    return (
        <DashboardLayout>
            <div className="max-w-lg mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">
                        Staðfesta afhendingu
                    </h1>
                    <p className="text-zinc-600 mt-1">
                        Fáðu undirskrift og taktu mynd
                    </p>
                </div>

                <DeliverPageClient
                    deliveryId={delivery.id}
                    projectName={project?.name || 'Óþekkt verkefni'}
                    elements={elements}
                    companyName={project?.company?.name}
                    deliveryAddress={project?.address || undefined}
                />
            </div>
        </DashboardLayout>
    )
}
