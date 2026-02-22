import { notFound } from 'next/navigation'
import { getRebarBatch } from '@/lib/factory/rebar-batch-actions'
import { createClient } from '@/lib/supabase/server'
import { PrintAction } from './PrintAction'

const typeLabels: Record<string, string> = {
    wall: 'Veggur',
    filigran: 'Filigran',
    balcony: 'Svalir',
    svalagangur: 'Svalagangur',
    staircase: 'Stigi',
    column: 'Súla',
    beam: 'Bita',
    ceiling: 'Þak',
    other: 'Annað',
}

export default async function RebarBatchPdfPage({
    params,
}: {
    params: Promise<{ batchId: string }>
}) {
    const { batchId } = await params
    const { data: batch, error } = await getRebarBatch(batchId)

    if (error || !batch) {
        notFound()
    }

    // Fetch all drawing documents for the project
    const supabase = await createClient()
    let projectDrawings: Array<{ id: string; name: string; file_url: string }> = []
    if (batch.project_id) {
        const { data: drawingsData } = await supabase
            .from('project_documents')
            .select('id, name, file_url')
            .eq('project_id', batch.project_id)
            .eq('category', 'drawing')
        if (drawingsData) projectDrawings = drawingsData
    }

    const totalWeight = batch.elements?.reduce((sum, el) => sum + (el.weight_kg || 0), 0) || 0

    return (
        <div className="bg-white min-h-screen p-8 max-w-4xl mx-auto font-sans text-black">
            <PrintAction />

            {/* Header */}
            <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold font-mono tracking-tight mb-2">
                        JÁRNALOTA: {batch.batch_number}
                    </h1>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Dagsetning:</strong> {new Date(batch.batch_date).toLocaleDateString('is-IS')}</p>
                        {batch.project && <p><strong>Verkefni:</strong> {batch.project.name}</p>}
                        <p><strong>Staða:</strong> {batch.status === 'approved' ? 'Samþykkt' : 'Í vinnslu'}</p>
                    </div>
                </div>
                <div className="text-right text-sm">
                    <p>Dags. prentunar: {new Date().toLocaleDateString('is-IS')}</p>
                    <p><strong>Heildarþyngd:</strong> {totalWeight.toLocaleString('is-IS')} kg</p>
                    <p><strong>Fjöldi eininga:</strong> {batch.elements?.length || 0}</p>
                </div>
            </div>

            {/* Checklist Section */}
            <div className="mb-12">
                <h2 className="text-xl font-bold mb-4 uppercase tracking-wider border-b border-gray-300 pb-2">
                    Gátlisti
                </h2>
                <div className="space-y-3">
                    {batch.checklist.map((item) => (
                        <div key={item.key} className="flex items-start gap-3">
                            <div className="w-5 h-5 border-2 border-black rounded-sm shrink-0 mt-0.5 flex items-center justify-center">
                                {item.checked && <div className="w-3 h-3 bg-black rounded-sm" />}
                            </div>
                            <span className={`text-base ${item.checked ? 'text-gray-500 line-through' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Elements Section */}
            <div>
                <h2 className="text-xl font-bold mb-4 uppercase tracking-wider border-b border-gray-300 pb-2">
                    Einingar í lotu
                </h2>

                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-gray-300">
                            <th className="py-3 font-semibold">Heiti</th>
                            <th className="py-3 font-semibold">Tegund</th>
                            <th className="py-3 font-semibold text-right">Hæð</th>
                            <th className="py-3 font-semibold text-right">Þyngd</th>
                            <th className="py-3 pl-6 font-semibold">Járnteikning / Spec</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {batch.elements?.map((element) => {
                            const matchingDrawings = projectDrawings.filter(d =>
                                element.name.toLowerCase().includes(d.name.toLowerCase()) ||
                                d.name.toLowerCase().includes(element.name.toLowerCase().split('-')[0])
                            ).slice(0, 1)

                            return (
                                <tr key={element.id}>
                                    <td className="py-3 font-medium text-base">{element.name}</td>
                                    <td className="py-3">{typeLabels[element.element_type] || element.element_type}</td>
                                    <td className="py-3 text-right">{element.floor != null ? element.floor : '—'}</td>
                                    <td className="py-3 text-right">
                                        {element.weight_kg ? `${element.weight_kg.toLocaleString('is-IS')} kg` : '—'}
                                    </td>
                                    <td className="py-3 pl-6 font-mono text-xs">
                                        <div className="flex flex-col gap-1">
                                            {element.rebar_spec ? (
                                                <span className="font-semibold">{element.rebar_spec}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Óskilgreint</span>
                                            )}
                                            {matchingDrawings.map(doc => (
                                                <span key={doc.id} className="text-gray-600">
                                                    📄 {doc.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {(!batch.elements || batch.elements.length === 0) && (
                    <p className="py-6 text-center text-gray-500 italic">
                        Engar einingar skráðar í þessa lotu.
                    </p>
                )}
            </div>

            {/* Footer Notes */}
            {batch.notes && (
                <div className="mt-12 pt-6 border-t border-gray-300">
                    <h3 className="font-bold mb-2 uppercase text-sm text-gray-600">Athugasemdir</h3>
                    <p className="whitespace-pre-wrap text-sm">{batch.notes}</p>
                </div>
            )}
        </div>
    )
}
