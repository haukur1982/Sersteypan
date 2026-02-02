import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { PageHeaderSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton'

export default function BuyerProjectsLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      </div>
    </DashboardLayoutSkeleton>
  )
}
