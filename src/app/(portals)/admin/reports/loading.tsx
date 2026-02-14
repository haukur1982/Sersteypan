import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-200 rounded ${className}`} />
}

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="w-9 h-9 rounded-md" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="ml-12 h-4 w-48 mt-1" />
      </div>

      {/* Date filter skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-9 w-[400px] rounded-lg" />

      {/* Chart cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Skeleton className="w-[180px] h-[180px] rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-zinc-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-full" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
