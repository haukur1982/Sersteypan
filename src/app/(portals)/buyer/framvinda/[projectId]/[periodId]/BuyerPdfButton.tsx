'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  periodId: string
}

export function BuyerPdfButton({ periodId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/framvinda/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: periodId }),
      })
      const data = await res.json()
      if (data.error) {
        setError('Villa við PDF: ' + data.error)
      } else if (data.pdf_url) {
        window.open(data.pdf_url, '_blank')
      }
    } catch {
      setError('Villa við að búa til PDF')
    }
    setLoading(false)
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Bý til PDF...
          </>
        ) : (
          <>
            <FileText className="mr-1 h-4 w-4" />
            Sækja PDF
          </>
        )}
      </Button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
