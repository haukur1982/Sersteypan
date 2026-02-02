import { Skeleton } from '@/components/ui/skeleton'

/**
 * Static skeleton layout for loading states.
 * Unlike DashboardLayout, this doesn't fetch any data.
 */
export default function DashboardLayoutSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar Skeleton (Left) - hidden on mobile */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        {/* Logo area */}
        <div className="h-16 border-b border-border px-6 flex items-center">
          <Skeleton className="h-6 w-28" />
        </div>

        {/* Navigation skeleton */}
        <nav className="flex-1 p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </nav>

        {/* User area skeleton */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header Skeleton (Top) - visible only on mobile */}
        <header className="md:hidden h-16 border-b border-border px-4 flex items-center justify-between bg-card">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
