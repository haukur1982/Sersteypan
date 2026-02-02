import DashboardLayoutSkeleton from '@/components/layout/DashboardLayoutSkeleton'
import { TableSkeleton, PageHeaderSkeleton } from '@/components/shared/TableSkeleton'

export default function ProjectsLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton showButton />
        <TableSkeleton rows={8} columns={5} />
      </div>
    </DashboardLayoutSkeleton>
  )
}
