import { Suspense } from 'react'
import { LoadPageClient } from './LoadPageClient'
import { Loader2 } from 'lucide-react'

export const metadata = {
    title: 'Hlaða á bíl | Sérsteypan',
    description: 'Bættu við einingum og hefja afhendingu',
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
    )
}

export default async function LoadPage() {
    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                    Hlaða á bíl
                </h1>
                <p className="text-zinc-600 mt-1">
                    Skannaðu einingar og búðu til afhendingu
                </p>
            </div>

            <Suspense fallback={<LoadingFallback />}>
                <LoadPageClient />
            </Suspense>
        </div>
    )
}
