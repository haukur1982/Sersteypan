import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { getBuyerMessages } from '@/lib/buyer/queries'
import { MessagesClient } from './MessagesClient'

export const metadata = {
  title: 'Skilaboð | Kaupandi',
  description: 'Skilaboð frá þínum verkefnum'
}

export default async function BuyerMessagesPage() {
  const user = await getUser()

  if (!user || user.role !== 'buyer') {
    redirect('/login')
  }

  const messages = await getBuyerMessages()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Skilaboð</h1>
        <p className="text-zinc-600 mt-2">
          Öll skilaboð tengd þínum verkefnum
        </p>
      </div>

      <MessagesClient messages={messages} currentUserId={user.id} />
    </div>
  )
}
