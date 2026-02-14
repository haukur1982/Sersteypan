import { getServerUser } from '@/lib/auth/getServerUser'
import { getAdminMessagesPaginated } from '@/lib/admin/queries'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Pagination } from '@/components/ui/pagination'
import { MessagesClient } from './MessagesClient'

export const metadata = {
  title: 'Skilaboð | Stjórnandi',
  description: 'Skilaboð frá öllum verkefnum'
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminMessagesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const urlSearchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') urlSearchParams.set(key, value)
  })

  const pagination = parsePaginationParams(urlSearchParams, { limit: 30 })

  const user = await getServerUser()
  const { data: messages, pagination: paginationMeta } = await getAdminMessagesPaginated(pagination)

  // Build searchParams for pagination links
  const activeSearchParams: Record<string, string> = {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Skilaboð</h1>
        <p className="text-zinc-600 mt-2">
          {paginationMeta.total} skilaboð samtals
        </p>
      </div>

      <MessagesClient messages={messages} currentUserId={user?.id || ''} />

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <Pagination
          currentPage={paginationMeta.page}
          totalPages={paginationMeta.totalPages}
          baseUrl="/admin/messages"
          searchParams={activeSearchParams}
          className="mt-4"
        />
      )}
    </div>
  )
}
