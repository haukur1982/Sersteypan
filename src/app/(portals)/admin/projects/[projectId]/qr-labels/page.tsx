import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getElementsForProject } from '@/lib/elements/actions'
import { resolveStorageUrls } from '@/lib/storage/resolveUrl'
import QRLabelsClient from './QRLabelsClient'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']

interface QRLabelsPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default async function QRLabelsPage({ params }: QRLabelsPageProps) {
    const { projectId } = await params

    const { data: project, error: projectError } = await getProject(projectId)
    if (projectError || !project) {
        return notFound()
    }

    const { data: elements } = await getElementsForProject(projectId)
    const elementList = (elements ?? []) as ElementRow[]

    // qr-codes bucket is private — sign with 24h expiry to survive long printing sessions
    const signedQrUrls = await resolveStorageUrls(
        elementList.map((el) => el.qr_code_url),
        'qr-codes',
        60 * 60 * 24
    )
    elementList.forEach((el, i) => {
        el.qr_code_url = signedQrUrls[i]
    })

    // Map to the shape expected by client component (enhanced with position/rebar info)
    const mappedElements = elementList.map(el => ({
        id: el.id,
        name: el.name,
        element_type: el.element_type,
        floor: el.floor,
        weight_kg: el.weight_kg,
        length_mm: el.length_mm,
        height_mm: el.height_mm,
        width_mm: el.width_mm,
        qr_code_url: el.qr_code_url,
        rebar_spec: el.rebar_spec ?? null,
        position_description: el.position_description ?? null,
    }))

    return (
        <QRLabelsClient
            projectName={project.name}
            projectId={projectId}
            elements={mappedElements}
        />
    )
}
