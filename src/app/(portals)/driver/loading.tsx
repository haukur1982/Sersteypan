import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { PageHeaderSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DriverLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton={false} />

        {/* Action buttons skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 border-zinc-200">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </Card>
          ))}
        </div>

        {/* Active deliveries skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </div>
      </div>
    </DashboardLayoutSkeleton>
  )
}
