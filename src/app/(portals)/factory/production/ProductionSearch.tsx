'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface ProductionSearchProps {
    initialSearch?: string
}

export function ProductionSearch({ initialSearch = '' }: ProductionSearchProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchTerm, setSearchTerm] = useState(initialSearch)
    const debouncedSearch = useDebounce(searchTerm, 500)

    useEffect(() => {
        // Skip first render if it matches initial
        if (debouncedSearch === initialSearch) return

        const params = new URLSearchParams(searchParams)
        if (debouncedSearch) {
            params.set('search', debouncedSearch)
            params.delete('page') // Reset pagination when searching
        } else {
            params.delete('search')
        }

        router.push(`${pathname}?${params.toString()}`)
    }, [debouncedSearch, router, pathname, searchParams, initialSearch])

    return (
        <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Leita að einingu (t.d. F(A)-1-1)..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    )
}
