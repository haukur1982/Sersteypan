import { getServerUser } from '@/lib/auth/getServerUser'
import { getAdminMessages } from '@/lib/admin/queries'
import { MessagesClient } from './MessagesClient'

export const metadata = {
  title: 'Skilaboð | Stjórnandi',
  description: 'Skilaboð frá öllum verkefnum'
}

export default async function AdminMessagesPage() {
  const user = await getServerUser()
  const messages = await getAdminMessages()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Skilaboð</h1>
        <p className="text-zinc-600 mt-2">
          Öll skilaboð í kerfinu
        </p>
      </div>

      <MessagesClient messages={messages} currentUserId={user?.id || ''} />
    </div>
  )
}
