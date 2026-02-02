import { getAllElementTypes } from '@/lib/element-types/queries'
import { ElementTypesManager } from './ElementTypesManager'

export default async function ElementTypesPage() {
    const types = await getAllElementTypes()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Tegundir eininga</h1>
                <p className="text-zinc-600 mt-2">
                    Stjórna tegundum eininga (Manage Element Types)
                </p>
            </div>

            {/* Client component for interactive management */}
            <ElementTypesManager initialTypes={types} />
        </div>
    )
}
