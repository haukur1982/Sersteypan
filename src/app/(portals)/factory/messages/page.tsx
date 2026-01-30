import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { getFactoryMessages } from '@/lib/factory/queries'
import { MessagesClient } from './MessagesClient'

export const metadata = {
  title: 'Skilaboð | Framleiðslustjóri',
  description: 'Skilaboð frá verkefnum'
}

export default async function FactoryMessagesPage() {
  const user = await getUser()

  if (!user || user.role !== 'factory_manager') {
    redirect('/login')
  }

  const messages = await getFactoryMessages()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Skilaboð</h1>
        <p className="text-zinc-600 mt-2">
          Skilaboð frá öllum verkefnum
        </p>
      </div>

      <MessagesClient messages={messages} currentUserId={user.id} />
    </div>
  )
}
