import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { PageHeaderSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton'

export default function DeliveriesLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </div>
      </div>
    </DashboardLayoutSkeleton>
  )
}
