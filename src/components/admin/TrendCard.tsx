import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface TrendCardProps {
    title: string
    value: number
    icon: LucideIcon
    iconBg: string
    iconColor: string
    href?: string
    thisWeek?: number
    lastWeek?: number
    highlight?: boolean
}

export function TrendCard({
    title,
    value,
    icon: Icon,
    iconBg,
    iconColor,
    href,
    thisWeek,
    lastWeek,
    highlight,
}: TrendCardProps) {
    const hasTrend = thisWeek !== undefined && lastWeek !== undefined
    const diff = hasTrend ? thisWeek - lastWeek : 0
    const trendUp = diff > 0
    const trendDown = diff < 0

    const content = (
        <Card className={`p-4 transition-all ${href ? 'hover:border-primary/50 hover:shadow-md' : ''} ${highlight ? 'border-green-200 bg-green-50/50' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-2xl font-bold ${highlight ? 'text-green-700' : 'text-foreground'}`}>{value}</p>
                    <p className={`text-xs ${highlight ? 'text-green-600' : 'text-muted-foreground'}`}>{title}</p>
                </div>
            </div>
            {hasTrend && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                    {trendUp && <TrendingUp className="w-3 h-3 text-green-600" />}
                    {trendDown && <TrendingDown className="w-3 h-3 text-red-500" />}
                    {!trendUp && !trendDown && <Minus className="w-3 h-3 text-zinc-400" />}
                    <span className={trendUp ? 'text-green-600' : trendDown ? 'text-red-500' : 'text-zinc-400'}>
                        {trendUp ? '+' : ''}{diff} þessa viku
                    </span>
                </div>
            )}
        </Card>
    )

    if (href) {
        return <Link href={href} className="group">{content}</Link>
    }
    return content
}
