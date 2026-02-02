import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { PageHeaderSkeleton, StatsGridSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton'

export default function BuyerLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <StatsGridSkeleton count={3} />
        <div className="grid gap-6 md:grid-cols-2">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    </DashboardLayoutSkeleton>
  )
}
