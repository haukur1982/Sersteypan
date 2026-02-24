'use client'

import { useRouter } from 'next/navigation'

// ── Type color mapping for visual identification on factory floor ──
const TYPE_COLORS: Record<string, string> = {
    wall: 'border-l-slate-500',
    filigran: 'border-l-blue-500',
    balcony: 'border-l-orange-500',
    svalagangur: 'border-l-orange-400',
    staircase: 'border-l-purple-500',
    column: 'border-l-red-500',
    beam: 'border-l-amber-500',
    ceiling: 'border-l-teal-500',
    other: 'border-l-zinc-400',
}

const TYPE_LABELS: Record<string, string> = {
    wall: 'Veggur',
    filigran: 'Filigran',
    balcony: 'Svalir',
    svalagangur: 'Svalagangar',
    staircase: 'Stigi',
    column: 'Sula',
    beam: 'Biti',
    ceiling: 'Thak',
    other: 'Annad',
}

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
        rebar_spec: string | null
        position_description: string | null
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
                        {elementsWithQR.length} af {elements.length} einingar me&eth; QR k&oacute;&eth;a
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/admin/projects/${projectId}`)}
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"
                    >
                        &larr; Til baka
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        Prenta merki
                    </button>
                </div>
            </div>

            {elementsWithQR.length === 0 ? (
                <div className="text-center py-16 print:hidden">
                    <p className="text-zinc-500 text-lg">Engir QR k&oacute;&eth;ar hafa veri&eth; b&uacute;nir til.</p>
                    <p className="text-zinc-400 mt-2">
                        Far&eth;u &iacute; verkefnas&iacute;&eth;una og smelltu &aacute; &quot;Generate QR Codes&quot;
                    </p>
                </div>
            ) : (
                <>
                    {/* Print instructions */}
                    <div className="print:hidden mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                        <strong>Pentlei&eth;beiningar:</strong> Stilltu prentara &aacute; A4 og &quot;100% Scale&quot;.
                        Hver s&iacute;&eth;a inniheldur 8 merki (2 x 4 grid). Nota&eth;u l&iacute;mmi&eth;apapp&iacute;r fyrir bestu ni&eth;urst&ouml;&eth;u.
                        Litabandi&eth; &aacute; vinstri hl&iacute;&eth; gefur til kynna tegund einingar.
                    </div>

                    {/* QR Labels Grid - Optimized for A4 printing */}
                    <div className="grid grid-cols-2 gap-4 print:gap-0">
                        {elementsWithQR.map((element, index) => {
                            const colorBand = TYPE_COLORS[element.element_type] ?? TYPE_COLORS.other
                            const typeLabel = TYPE_LABELS[element.element_type] ?? element.element_type

                            return (
                                <div
                                    key={element.id}
                                    className={`
                                        border border-zinc-300 rounded-lg p-4
                                        border-l-4 ${colorBand}
                                        print:border-dashed print:border-zinc-400 print:rounded-none
                                        print:border-l-4 print:border-l-solid
                                        print:p-3 print:break-inside-avoid
                                        ${(index + 1) % 8 === 0 ? 'print:page-break-after' : ''}
                                    `}
                                >
                                    <div className="flex gap-4 items-start">
                                        {/* QR Code Image — larger for dusty factory scanning */}
                                        <div className="flex-shrink-0">
                                            {element.qr_code_url && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={element.qr_code_url}
                                                    alt={`QR for ${element.name}`}
                                                    className="w-32 h-32 print:w-24 print:h-24"
                                                />
                                            )}
                                        </div>

                                        {/* Element Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-zinc-900 print:text-base truncate">
                                                {element.name}
                                            </h3>
                                            <p className="text-sm text-zinc-500 print:text-xs mt-0.5">
                                                {projectName}
                                            </p>

                                            {/* Weight — LARGE for crane operators */}
                                            {element.weight_kg != null && (
                                                <div className="mt-2">
                                                    <span className="text-xl font-bold text-zinc-900 print:text-lg">
                                                        {element.weight_kg.toLocaleString('is-IS')} kg
                                                    </span>
                                                </div>
                                            )}

                                            <div className="mt-1.5 space-y-0.5 text-xs text-zinc-600 print:text-[10px]">
                                                <div className="flex gap-2">
                                                    <span className="font-medium">Tegund:</span>
                                                    <span>{typeLabel}</span>
                                                </div>
                                                {element.floor != null && (
                                                    <div className="flex gap-2">
                                                        <span className="font-medium">H&aelig;&eth;:</span>
                                                        <span>{element.floor}. h&aelig;&eth;</span>
                                                    </div>
                                                )}
                                                {element.position_description && (
                                                    <div className="flex gap-2">
                                                        <span className="font-medium">Sta&eth;s.:</span>
                                                        <span className="truncate">{element.position_description}</span>
                                                    </div>
                                                )}
                                                {element.rebar_spec && (
                                                    <div className="flex gap-2">
                                                        <span className="font-medium">J&aacute;rn:</span>
                                                        <span className="truncate">{element.rebar_spec}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Dimensions */}
                                            {(element.length_mm || element.height_mm || element.width_mm) && (
                                                <div className="mt-1.5 text-xs font-mono text-zinc-500 print:text-[9px]">
                                                    {element.length_mm || '\u2014'}L &times; {element.height_mm || '\u2014'}H &times; {element.width_mm || '\u2014'}W mm
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Element ID (small, for reference) */}
                                    <div className="mt-1.5 text-[10px] font-mono text-zinc-400 truncate print:text-[8px]">
                                        ID: {element.id}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Print-only footer */}
            <div className="hidden print:block fixed bottom-4 right-4 text-xs text-zinc-400">
                S&eacute;rsteypan &bull; {new Date().toLocaleDateString('is-IS')}
            </div>
        </div>
    )
}
