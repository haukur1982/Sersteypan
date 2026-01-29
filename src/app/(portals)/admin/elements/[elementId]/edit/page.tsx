import { getElement } from '@/lib/elements/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ElementForm } from '@/components/elements/ElementForm'

interface EditElementPageProps {
    params: Promise<{
        elementId: string
    }>
}

export default async function EditElementPage({ params }: EditElementPageProps) {
    const { elementId } = await params
    const { data: element, error } = await getElement(elementId)

    if (error || !element) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600">Villa</h1>
                    <p className="text-zinc-600">Ekki tókst að finna einingu eða villa kom upp.</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Breyta einingu</h1>
                    <p className="text-zinc-600 mt-2">Uppfæra upplýsingar um {element.name}</p>
                </div>

                <ElementForm initialData={element} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
