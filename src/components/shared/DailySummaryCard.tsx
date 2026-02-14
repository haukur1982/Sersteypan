'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, AlertTriangle, Info, AlertCircle, RefreshCw } from 'lucide-react'

type Anomaly = {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

type SummaryData = {
  summary: string
  anomalies: Anomaly[]
  generatedAt: string
  cached: boolean
}

/**
 * AI-generated daily production summary card.
 * Fetches from /api/ai/daily-summary on mount.
 * Silently hidden if the feature is disabled (no API key) or on error.
 */
export function DailySummaryCard() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/ai/daily-summary')
        if (!res.ok) {
          // 404 = feature disabled, any other error = hide silently
          setHidden(true)
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setHidden(true)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  // Don't render if disabled or errored
  if (hidden) return null

  // Loading skeleton
  if (loading) {
    return (
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-violet-50/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-violet-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Samantekt dagsins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-violet-100 rounded w-full" />
            <div className="h-4 bg-violet-100 rounded w-5/6" />
            <div className="h-4 bg-violet-100 rounded w-4/6" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const severityConfig = {
    info: { icon: Info, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    warning: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    critical: { icon: AlertCircle, color: 'bg-red-100 text-red-700 border-red-200' },
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-violet-50/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-violet-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Samantekt dagsins
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-violet-500">
            {data.cached && (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Í skyndiminni
              </span>
            )}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary text */}
        <p className="text-sm text-violet-900 leading-relaxed whitespace-pre-line">
          {data.summary}
        </p>

        {/* Anomaly badges */}
        {data.anomalies && data.anomalies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {data.anomalies.map((anomaly, index) => {
              const config = severityConfig[anomaly.severity] || severityConfig.info
              const AnomalyIcon = config.icon
              return (
                <Badge
                  key={index}
                  variant="outline"
                  className={`${config.color} text-xs gap-1`}
                >
                  <AnomalyIcon className="w-3 h-3" />
                  {anomaly.message}
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
