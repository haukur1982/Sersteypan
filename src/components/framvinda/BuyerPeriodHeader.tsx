import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'

interface BuyerPeriodHeaderProps {
  companyName: string
  projectName: string
  projectAddress?: string | null
  periodNumber: number
  periodStart: string
  periodEnd: string
  isFinalized: boolean
  description?: string | null
  backHref: string
}

export function BuyerPeriodHeader({
  companyName,
  projectName,
  projectAddress,
  periodNumber,
  periodStart,
  periodEnd,
  isFinalized,
  description,
  backHref,
}: BuyerPeriodHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Til baka
      </Link>

      {/* Invoice header card */}
      <Card className="border-zinc-200 shadow-sm border-b-2 border-b-blue-600 overflow-hidden">
        <CardContent className="px-8 py-6">
          <div className="flex justify-between items-start">
            {/* Left: Company & Project */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-2">
                Sérsteypan ehf
              </p>
              <h1 className="text-xl font-bold text-zinc-900">
                {projectName}
              </h1>
              <p className="text-sm text-zinc-600 mt-0.5">{companyName}</p>
              {projectAddress && (
                <p className="text-xs text-zinc-400 mt-0.5">{projectAddress}</p>
              )}
            </div>

            {/* Right: Period ID & Date */}
            <div className="text-right flex-shrink-0">
              <h2 className="text-2xl font-bold text-zinc-900">
                Framvinda {periodNumber}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {new Date(periodStart).toLocaleDateString('is-IS', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {' — '}
                {new Date(periodEnd).toLocaleDateString('is-IS', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              {isFinalized && (
                <Badge
                  variant="secondary"
                  className="mt-2 bg-green-100 text-green-700 border-green-200"
                >
                  <Lock className="mr-1 h-3 w-3" />
                  Lokið
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {description && (
        <Card className="border-zinc-200 shadow-sm border-l-2 border-l-zinc-300">
          <CardContent className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Lýsing á framvindu
            </p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
