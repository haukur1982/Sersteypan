import { Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { SearchPageClient } from './SearchPageClient'
import { Loader2 } from 'lucide-react'

export const metadata = {
    title: 'Leita | Sérsteypan',
    description: 'Leita að verkefnum, fyrirtækjum og einingum',
}

function SearchFallback() {
    return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
    )
}

export default function SearchPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={<SearchFallback />}>
                <SearchPageClient />
            </Suspense>
        </DashboardLayout>
    )
}
