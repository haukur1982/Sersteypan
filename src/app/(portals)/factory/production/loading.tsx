import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { TableSkeleton, PageHeaderSkeleton } from '@/components/shared/TableSkeleton'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProductionLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton={false} />

        {/* Status filter buttons skeleton */}
        <Card className="p-4 border-zinc-200">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
        </Card>

        <TableSkeleton rows={10} columns={7} />
      </div>
    </DashboardLayoutSkeleton>
  )
}
