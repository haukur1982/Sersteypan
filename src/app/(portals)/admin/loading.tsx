import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from '@/components/shared/TableSkeleton'

export default function AdminLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <StatsGridSkeleton count={4} />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </DashboardLayoutSkeleton>
  )
}
