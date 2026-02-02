'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin Portal Error:', error)
    Sentry.captureException(error, {
      tags: { errorBoundary: 'admin', portal: 'admin' },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">Villa kom upp</h1>
          <p className="text-zinc-600">
            Eitthvað fór úrskeiðis í stjórnborðinu. Vinsamlegast reyndu aftur.
          </p>
          <p className="text-sm text-zinc-500">
            (Something went wrong in the admin portal)
          </p>
        </div>

        {error.digest && (
          <div className="bg-zinc-100 rounded p-2">
            <p className="text-xs text-zinc-500 font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reyna aftur
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/admin">
              <Home className="w-4 h-4 mr-2" />
              Til baka í stjórnborð
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
