import { redirect, notFound } from 'next/navigation'
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
    const { id } = await params
    const supabase = await createClient()

    // Fetch delivery with elements and confirmation status
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
        delivered_at,
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

    // Extract elements from delivery items with confirmation status
    const elements = delivery.delivery_items
        .map((item) => ({
            element: item.element,
            confirmedAt: item.delivered_at
        }))
        .filter((item): item is { element: { id: string; name: string; status: string | null }; confirmedAt: string | null } =>
            item.element !== null
        )
        .map((item) => ({
            id: item.element.id,
            name: item.element.name,
            status: item.element.status || 'planned',
            confirmedAt: item.confirmedAt
        }))

    const project = delivery.project as {
        id: string
        name: string
        company: { name: string } | null
        address: string | null
    } | null

    // TODO: Add latitude, longitude to query after running migration 017_add_project_coordinates.sql
    // Then build coordinates: { latitude: project.latitude, longitude: project.longitude }
    const projectCoordinates = null

    return (
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
                deliveryStatus={delivery.status || 'planned'}
                projectName={project?.name || 'Óþekkt verkefni'}
                elements={elements}
                companyName={project?.company?.name}
                deliveryAddress={project?.address || undefined}
                projectCoordinates={projectCoordinates}
            />
        </div>
    )
}
