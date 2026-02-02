import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  columnWidths?: string[]
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  columnWidths
}: TableSkeletonProps) {
  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden">
      <Table>
        {showHeader && (
          <TableHeader className="bg-zinc-50">
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i} className="py-4">
                  <Skeleton
                    className="h-3 bg-zinc-300"
                    style={{ width: columnWidths?.[i] || '60%' }}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="border-b border-zinc-100">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex} className="py-4">
                  <Skeleton
                    className="h-4"
                    style={{
                      width: colIndex === 0 ? '80%' : colIndex === columns - 1 ? '40%' : '60%'
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

interface PageHeaderSkeletonProps {
  showButton?: boolean
}

export function PageHeaderSkeleton({ showButton = true }: PageHeaderSkeletonProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {showButton && <Skeleton className="h-9 w-32" />}
    </div>
  )
}

interface CardSkeletonProps {
  lines?: number
}

export function CardSkeleton({ lines = 3 }: CardSkeletonProps) {
  return (
    <Card className="p-6 border-zinc-200">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${80 - i * 15}%` }}
          />
        ))}
      </div>
    </Card>
  )
}

interface StatsGridSkeletonProps {
  count?: number
}

export function StatsGridSkeleton({ count = 4 }: StatsGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 border-zinc-200">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
  )
}
