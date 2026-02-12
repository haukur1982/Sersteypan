'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessagesList } from '@/components/shared/MessagesList'
import { sendFactoryMessage, markMessagesAsRead } from '@/lib/factory/actions'

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
  element?: {
    id: string
    name: string
    element_type: string
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
      .channel('factory-messages')
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
          console.log('Subscribed to factory messages')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [router])

  const handleSendMessage = async (projectId: string, message: string, elementId?: string | null) => {
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('message', message)
    if (elementId) formData.append('elementId', elementId)

    return await sendFactoryMessage(formData)
  }

  const handleMarkAsRead = async (messageIds: string[]) => {
    return await markMessagesAsRead(messageIds)
  }

  return (
    <MessagesList
      messages={messages}
      onSendMessage={handleSendMessage}
      onMarkAsRead={handleMarkAsRead}
      showProjectInfo={true}
      currentUserId={currentUserId}
      elementLinkPrefix="/factory/production"
    />
  )
}
