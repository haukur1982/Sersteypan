import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { PageHeaderSkeleton, StatsGridSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton'

export default function FactoryLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <StatsGridSkeleton count={6} />
        <div className="grid gap-6 md:grid-cols-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    </DashboardLayoutSkeleton>
  )
}
