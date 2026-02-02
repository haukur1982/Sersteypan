import { getUser } from '@/lib/auth/actions'
import { getFactoryMessages } from '@/lib/factory/queries'
import { MessagesClient } from './MessagesClient'

export const metadata = {
  title: 'Skilaboð | Framleiðslustjóri',
  description: 'Skilaboð frá verkefnum'
}

export default async function FactoryMessagesPage() {
  // Layout handles auth, we just need user data for display
  const user = await getUser()
  const messages = await getFactoryMessages()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Skilaboð</h1>
        <p className="text-zinc-600 mt-2">
          Skilaboð frá öllum verkefnum
        </p>
      </div>

      <MessagesClient messages={messages} currentUserId={user?.id || ''} />
    </div>
  )
}
