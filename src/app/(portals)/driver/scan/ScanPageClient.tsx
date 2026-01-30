'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRScanner } from '@/components/driver/QRScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
    Package,
    Search,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowRight,
    Building2,
    Layers
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ScannedElement {
    id: string
    name: string
    status: string
    project: {
        id: string
        name: string
        company: {
            name: string
        } | null
    } | null
}

export function ScanPageClient() {
    const router = useRouter()
    const [scannedElement, setScannedElement] = useState<ScannedElement | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [manualSearch, setManualSearch] = useState('')
    const [showManualSearch, setShowManualSearch] = useState(false)

    const supabase = createClient()

    const lookupElement = async (elementId: string) => {
        setIsLoading(true)
        setError(null)
        setScannedElement(null)

        try {
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(elementId)) {
                setError('Ógildur QR kóði. Vinsamlegast reyndu aftur.')
                setIsLoading(false)
                return
            }

            const { data, error: fetchError } = await supabase
                .from('elements')
                .select(`
          id,
          name,
          status,
          project:projects(
            id,
            name,
            company:companies(name)
          )
        `)
                .eq('id', elementId)
                .single()

            if (fetchError || !data) {
                setError('Eining fannst ekki. Athugaðu QR kóðann.')
                setIsLoading(false)
                return
            }

            setScannedElement(data as unknown as ScannedElement)
        } catch (err) {
            console.error('Lookup error:', err)
            setError('Villa við leit. Reyndu aftur.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleScan = (decodedText: string) => {
        // QR code should contain element UUID
        lookupElement(decodedText.trim())
    }

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualSearch.trim()) {
            lookupElement(manualSearch.trim())
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, { label: string; color: string }> = {
            planned: { label: 'Skipulagt', color: 'bg-zinc-100 text-zinc-800' },
            rebar: { label: 'Járnabundið', color: 'bg-orange-100 text-orange-800' },
            cast: { label: 'Steypt', color: 'bg-blue-100 text-blue-800' },
            curing: { label: 'Þornar', color: 'bg-purple-100 text-purple-800' },
            ready: { label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
            loaded: { label: 'Á bíl', color: 'bg-amber-100 text-amber-800' },
            delivered: { label: 'Afhent', color: 'bg-emerald-100 text-emerald-800' },
        }
        return labels[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    }

    const canLoad = scannedElement?.status === 'ready'

    return (
        <div className="space-y-6">
            {/* Scanner Section */}
            <QRScanner
                onScan={handleScan}
                onError={(err) => setError(err)}
            />

            {/* Manual Search Toggle */}
            <div className="text-center">
                <button
                    onClick={() => setShowManualSearch(!showManualSearch)}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900"
                >
                    {showManualSearch ? 'Fela handvirka leit' : 'Handvirk leit (ef QR er skemmdur)'}
                </button>
            </div>

            {/* Manual Search Form */}
            {showManualSearch && (
                <form onSubmit={handleManualSearch} className="flex gap-2">
                    <Input
                        placeholder="Sláðu inn einingarnúmer (UUID)"
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading}>
                        <Search className="w-4 h-4 mr-2" />
                        Leita
                    </Button>
                </form>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                    <span className="ml-3 text-zinc-600">Leita að einingu...</span>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <Card className="p-4 border-red-200 bg-red-50">
                    <div className="flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-600" />
                        <div>
                            <p className="font-medium text-red-900">{error}</p>
                            <p className="text-sm text-red-700">Reyndu að skanna aftur</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Scanned Element Result */}
            {scannedElement && (
                <Card className="p-6 border-2 border-green-200 bg-green-50/50">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <p className="text-sm text-zinc-500">Eining fundin</p>
                                <h3 className="text-2xl font-bold text-zinc-900">
                                    {scannedElement.name}
                                </h3>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm">
                                {scannedElement.project && (
                                    <>
                                        <div className="flex items-center gap-1 text-zinc-600">
                                            <Layers className="w-4 h-4" />
                                            <span>{scannedElement.project.name}</span>
                                        </div>
                                        {scannedElement.project.company && (
                                            <div className="flex items-center gap-1 text-zinc-600">
                                                <Building2 className="w-4 h-4" />
                                                <span>{scannedElement.project.company.name}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-600">Staða:</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusLabel(scannedElement.status).color}`}>
                                    {getStatusLabel(scannedElement.status).label}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 pt-4">
                                {canLoad ? (
                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={() => {
                                            // TODO: Add to current delivery or create new
                                            router.push(`/driver/load?element=${scannedElement.id}`)
                                        }}
                                    >
                                        <Package className="w-5 h-5 mr-2" />
                                        Hlaða á bíl
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                        <p className="font-medium">Ekki hægt að hlaða</p>
                                        <p>Eining þarf að vera &quot;Tilbúið&quot; til að hlaða á bíl.</p>
                                        <p>Núverandi staða: {getStatusLabel(scannedElement.status).label}</p>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setScannedElement(null)
                                        setError(null)
                                    }}
                                >
                                    Skanna aðra einingu
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}
