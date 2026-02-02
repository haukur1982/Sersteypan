'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCard, type Message, type OptimisticMessage } from './MessageCard'
import { MessageReplyForm } from './MessageReplyForm'

interface MessagesListProps {
  messages: Message[]
  onSendMessage?: (projectId: string, message: string) => Promise<{ error?: string; success?: boolean }>
  onMarkAsRead?: (messageIds: string[]) => Promise<{ error?: string; success?: boolean }>
  showProjectInfo?: boolean
  currentUserId?: string
}

const roleLabels: Record<string, string> = {
  admin: 'Stjórnandi',
  factory_manager: 'Framleiðslustjóri',
  buyer: 'Kaupandi',
  driver: 'Bílstjóri'
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  factory_manager: 'bg-blue-100 text-blue-800',
  buyer: 'bg-green-100 text-green-800',
  driver: 'bg-orange-100 text-orange-800'
}

function getRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Óþekkt'

  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Núna'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mín síðan`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} klst síðan`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dögum síðan`

  return date.toLocaleDateString('is-IS', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function MessagesList({
  messages: serverMessages,
  onSendMessage,
  onMarkAsRead,
  showProjectInfo = true,
  currentUserId
}: MessagesListProps) {
  const router = useRouter()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMarkedAsReadRef = useRef(false)
  const optimisticIdRef = useRef(0)

  const allMessages = [...serverMessages, ...optimisticMessages]

  // Auto-mark messages as read
  useEffect(() => {
    if (!currentUserId || !onMarkAsRead || hasMarkedAsReadRef.current) return

    const unreadMessages = serverMessages
      .filter(m => !m.is_read && m.user?.id !== currentUserId)
      .map(m => m.id)

    if (unreadMessages.length > 0) {
      hasMarkedAsReadRef.current = true
      onMarkAsRead(unreadMessages).then(result => {
        if (result.error) {
          console.error('Failed to mark messages as read:', result.error)
        } else {
          router.refresh()
        }
      })
    }
  }, [serverMessages, currentUserId, onMarkAsRead, router])

  useEffect(() => {
    hasMarkedAsReadRef.current = false
  }, [serverMessages.length])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [allMessages.length, scrollToBottom])

  // Group messages by project
  const messagesByProject = allMessages.reduce((acc, msg) => {
    const projectId = msg.project_id
    if (!acc[projectId]) {
      acc[projectId] = {
        project: msg.project,
        messages: []
      }
    }
    acc[projectId].messages.push(msg)
    return acc
  }, {} as Record<string, { project: Message['project']; messages: OptimisticMessage[] }>)

  const sendMessage = useCallback(async () => {
    if (!selectedProjectId || !newMessage.trim() || !onSendMessage || isSubmitting) return

    const messageText = newMessage.trim()
    setIsSubmitting(true)
    setError(null)

    optimisticIdRef.current += 1
    const optimisticId = `optimistic-${optimisticIdRef.current}`

    const optimisticMsg: OptimisticMessage = {
      id: optimisticId,
      project_id: selectedProjectId,
      message: messageText,
      is_read: true,
      created_at: new Date().toISOString(),
      user: currentUserId ? {
        id: currentUserId,
        full_name: 'Þú',
        role: 'current_user'
      } : null,
      project: messagesByProject[selectedProjectId]?.project || null,
      isOptimistic: true,
      isSending: true
    }

    setOptimisticMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')

    const result = await onSendMessage(selectedProjectId, messageText)

    if (result.error) {
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setError(result.error)
      setNewMessage(messageText)
    } else {
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      }, 500)
      setSelectedProjectId(null)
      router.refresh()
    }

    setIsSubmitting(false)
  }, [selectedProjectId, newMessage, onSendMessage, isSubmitting, currentUserId, messagesByProject, router])

  if (allMessages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-zinc-900 font-semibold text-lg">Engin skilaboð ennþá</p>
          <p className="text-sm text-zinc-500 mt-2 text-center max-w-md">
            {onSendMessage
              ? 'Byrjaðu samtal með því að velja verkefni og senda skilaboð hér að neðan.'
              : 'Skilaboð munu birtast hér þegar þau eru send.'
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  const sortedProjectEntries = Object.entries(messagesByProject).sort((a, b) => {
    const latestA = Math.max(...a[1].messages.map(m => m.created_at ? new Date(m.created_at).getTime() : 0))
    const latestB = Math.max(...b[1].messages.map(m => m.created_at ? new Date(m.created_at).getTime() : 0))
    return latestB - latestA
  })

  return (
    <div className="space-y-6">
      {onSendMessage && (
        <MessageReplyForm
          projects={sortedProjectEntries.map(([projectId, { project }]) => ({ projectId, project }))}
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
          newMessage={newMessage}
          onMessageChange={setNewMessage}
          onSubmit={sendMessage}
          isSubmitting={isSubmitting}
          error={error}
          onErrorClear={() => setError(null)}
        />
      )}

      <div className="space-y-6">
        {sortedProjectEntries.map(([projectId, { project, messages: projectMessages }]) => (
          <Card key={projectId} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-zinc-50 to-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-zinc-500" />
                    {project?.name || 'Óþekkt verkefni'}
                  </CardTitle>
                  {showProjectInfo && project?.company && (
                    <CardDescription className="mt-1">
                      {project.company.name}
                    </CardDescription>
                  )}
                </div>
                <Badge variant="secondary" className="ml-2">
                  {projectMessages.length} {projectMessages.length === 1 ? 'skilaboð' : 'skilaboð'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 max-h-[600px] overflow-y-auto">
              {projectMessages
                .sort((a, b) => {
                  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
                  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
                  return timeB - timeA
                })
                .map((msg) => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    currentUserId={currentUserId}
                    roleLabels={roleLabels}
                    roleColors={roleColors}
                    getRelativeTime={getRelativeTime}
                  />
                ))}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Re-export types for convenience
export type { Message, OptimisticMessage } from './MessageCard'
