'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

const periods = [
  { key: '7d', label: '7 dagar' },
  { key: '30d', label: '30 dagar' },
  { key: '90d', label: '90 dagar' },
  { key: 'all', label: 'Allt' },
]

export function DateRangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('period') || '30d'

  function handleChange(period: string) {
    const params = new URLSearchParams()
    params.set('period', period)
    router.push(`/admin/reports?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((p) => (
        <Button
          key={p.key}
          variant={current === p.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleChange(p.key)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
