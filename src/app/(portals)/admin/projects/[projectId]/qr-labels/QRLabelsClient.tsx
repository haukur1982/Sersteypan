'use client'

import { useRouter } from 'next/navigation'

interface QRLabelsClientProps {
    projectName: string
    projectId: string
    elements: Array<{
        id: string
        name: string
        element_type: string
        floor: number | null
        weight_kg: number | null
        length_mm: number | null
        height_mm: number | null
        width_mm: number | null
        qr_code_url: string | null
    }>
}

export default function QRLabelsClient({ projectName, projectId, elements }: QRLabelsClientProps) {
    const router = useRouter()
    const elementsWithQR = elements.filter(el => el.qr_code_url)

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="min-h-screen bg-white p-8">
            {/* Print Header - only shows on screen */}
            <div className="print:hidden mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">QR Merki - {projectName}</h1>
                    <p className="text-zinc-500 mt-1">
                        {elementsWithQR.length} af {elements.length} einingar með QR kóða
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/admin/projects/${projectId}`)}
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"
                    >
                        ← Til baka
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        🖨️ Prenta merki
                    </button>
                </div>
            </div>

            {elementsWithQR.length === 0 ? (
                <div className="text-center py-16 print:hidden">
                    <p className="text-zinc-500 text-lg">Engir QR kóðar hafa verið búnir til.</p>
                    <p className="text-zinc-400 mt-2">
                        Farðu í verkefnasíðuna og smelltu á &quot;Generate QR Codes&quot;
                    </p>
                </div>
            ) : (
                <>
                    {/* Print instructions */}
                    <div className="print:hidden mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                        <strong>Prentleiðbeiningar:</strong> Stilltu prentara á A4 og &quot;100% Scale&quot;.
                        Hver síða inniheldur 8 merki (2 x 4 grid). Notaðu límmiðapappír fyrir bestu niðurstöðu.
                    </div>

                    {/* QR Labels Grid - Optimized for A4 printing */}
                    <div className="grid grid-cols-2 gap-4 print:gap-0">
                        {elementsWithQR.map((element, index) => (
                            <div
                                key={element.id}
                                className={`
                                    border border-zinc-300 rounded-lg p-4
                                    print:border-dashed print:border-zinc-400 print:rounded-none
                                    print:p-3 print:break-inside-avoid
                                    ${(index + 1) % 8 === 0 ? 'print:page-break-after' : ''}
                                `}
                            >
                                <div className="flex gap-4 items-start">
                                    {/* QR Code Image */}
                                    <div className="flex-shrink-0">
                                        {element.qr_code_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={element.qr_code_url}
                                                alt={`QR for ${element.name}`}
                                                className="w-24 h-24 print:w-20 print:h-20"
                                            />
                                        )}
                                    </div>

                                    {/* Element Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-zinc-900 print:text-base truncate">
                                            {element.name}
                                        </h3>
                                        <p className="text-sm text-zinc-500 print:text-xs mt-1">
                                            {projectName}
                                        </p>

                                        <div className="mt-2 space-y-0.5 text-xs text-zinc-600 print:text-[10px]">
                                            <div className="flex gap-2">
                                                <span className="font-medium">Tegund:</span>
                                                <span className="capitalize">{element.element_type}</span>
                                            </div>
                                            {element.floor && (
                                                <div className="flex gap-2">
                                                    <span className="font-medium">Hæð:</span>
                                                    <span>{element.floor}</span>
                                                </div>
                                            )}
                                            {element.weight_kg && (
                                                <div className="flex gap-2">
                                                    <span className="font-medium">Þyngd:</span>
                                                    <span>{element.weight_kg} kg</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Dimensions */}
                                        {(element.length_mm || element.height_mm || element.width_mm) && (
                                            <div className="mt-2 text-xs font-mono text-zinc-500 print:text-[9px]">
                                                {element.length_mm || '—'}L × {element.height_mm || '—'}H × {element.width_mm || '—'}W mm
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Element ID (small, for reference) */}
                                <div className="mt-2 text-[10px] font-mono text-zinc-400 truncate print:text-[8px]">
                                    ID: {element.id}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Print-only footer */}
            <div className="hidden print:block fixed bottom-4 right-4 text-xs text-zinc-400">
                Sérsteypan • {new Date().toLocaleDateString('is-IS')}
            </div>
        </div>
    )
}
