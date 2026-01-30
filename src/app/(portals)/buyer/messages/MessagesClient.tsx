'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessagesList } from '@/components/shared/MessagesList'
import { sendMessage, markMessagesAsRead } from '@/lib/buyer/actions'

type Message = {
  id: string
  project_id: string
  message: string
  is_read: boolean | null
  created_at: string | null
  user: {
    id: string
    full_name: string
    role: string
  } | null
  project: {
    id: string
    name: string
    company: {
      id: string
      name: string
    } | null
  } | null
}

interface MessagesClientProps {
  messages: Message[]
  currentUserId: string
}

export function MessagesClient({ messages, currentUserId }: MessagesClientProps) {
  const router = useRouter()

  // Set up real-time subscription for messages
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('buyer-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_messages'
        },
        (payload) => {
          console.log('Message change detected:', payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to buyer messages')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [router])

  const handleSendMessage = async (projectId: string, message: string) => {
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('message', message)

    return await sendMessage(formData)
  }

  const handleMarkAsRead = async (messageIds: string[]) => {
    return await markMessagesAsRead(messageIds)
  }

  return (
    <MessagesList
      messages={messages}
      onSendMessage={handleSendMessage}
      onMarkAsRead={handleMarkAsRead}
      showProjectInfo={false}
      currentUserId={currentUserId}
    />
  )
}
