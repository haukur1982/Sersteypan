import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VisualVerificationClient from './VisualVerificationClient'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function VisualIdentifierPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch Element Data (layout handles auth)
    const { data: element, error } = await supabase
        .from('elements')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !element) {
        notFound()
    }

    // 3. Render Client Component
    return (
        <VisualVerificationClient
            element={{
                id: element.id,
                name: element.name,
                element_type: element.element_type,
                length_mm: element.length_mm,
                height_mm: element.height_mm,
                width_mm: element.width_mm,
                status: element.status
            }}
        />
    )
}
