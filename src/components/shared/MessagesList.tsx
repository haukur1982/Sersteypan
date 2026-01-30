'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Building2, User, AlertCircle, Loader2, CheckCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

interface MessagesListProps {
  messages: Message[]
  onSendMessage?: (projectId: string, message: string) => Promise<{ error?: string; success?: boolean }>
  onMarkAsRead?: (messageIds: string[]) => Promise<{ error?: string; success?: boolean }>
  showProjectInfo?: boolean
  currentUserId?: string
}

// Optimistic message type for showing messages before server confirms
type OptimisticMessage = Message & {
  isOptimistic?: boolean
  isSending?: boolean
  sendError?: string
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMarkedAsReadRef = useRef(false)
  const optimisticIdRef = useRef(0)

  // Combine server messages with optimistic messages
  const allMessages = [...serverMessages, ...optimisticMessages]

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

  // CRITICAL: Auto-mark messages as read when viewing
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
          // Silently refresh to update UI
          router.refresh()
        }
      })
    }
  }, [serverMessages, currentUserId, onMarkAsRead, router])

  // Reset hasMarkedAsRead when messages change significantly
  useEffect(() => {
    hasMarkedAsReadRef.current = false
  }, [serverMessages.length])

  // Auto-scroll to bottom when new messages arrive
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

  // Relative time formatting
  const getRelativeTime = (dateString: string | null) => {
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

  const sendMessage = useCallback(async () => {
    if (!selectedProjectId || !newMessage.trim() || !onSendMessage || isSubmitting) return

    const messageText = newMessage.trim()
    setIsSubmitting(true)
    setError(null)

    optimisticIdRef.current += 1
    const optimisticId = `optimistic-${optimisticIdRef.current}`

    // Optimistic update - show message immediately
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

    // Actually send the message
    const result = await onSendMessage(selectedProjectId, messageText)

    if (result.error) {
      // Remove optimistic message and show error
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setError(result.error)
      setNewMessage(messageText) // Restore message
    } else {
      // Success - remove optimistic message (real one will come via real-time)
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      }, 500)

      setSelectedProjectId(null)
      router.refresh()
    }

    setIsSubmitting(false)
  }, [
    selectedProjectId,
    newMessage,
    onSendMessage,
    isSubmitting,
    currentUserId,
    messagesByProject,
    router
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage()
  }

  // Keyboard shortcut: Ctrl/Cmd + Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
      e.preventDefault()
      void sendMessage()
    }
  }

  // Character count with warning
  const charCount = newMessage.length
  const charLimit = 5000
  const charWarning = charCount > 4500

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

  return (
    <div className="space-y-6">
      {/* Reply Form */}
      {onSendMessage && (
        <Card>
          <CardHeader>
            <CardTitle>Senda skilaboð</CardTitle>
            <CardDescription>
              Veldu verkefni og skrifaðu skilaboð. Ýttu á <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-xs">Enter</kbd> til að senda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Villa við að senda skilaboð</p>
                  <p className="text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="project-select" className="block text-sm font-medium text-zinc-700 mb-2">
                Verkefni
              </label>
              <select
                id="project-select"
                value={selectedProjectId || ''}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value)
                  setError(null)
                  // Focus textarea after selecting project
                  setTimeout(() => textareaRef.current?.focus(), 100)
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isSubmitting}
              >
                <option value="">Veldu verkefni...</option>
                {Object.entries(messagesByProject).map(([projectId, { project }]) => (
                  <option key={projectId} value={projectId}>
                    {project?.name || 'Óþekkt verkefni'}
                    {project?.company?.name && ` - ${project.company.name}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message-textarea" className="block text-sm font-medium text-zinc-700 mb-2">
                Skilaboð
              </label>
              <Textarea
                id="message-textarea"
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skrifaðu skilaboð..."
                rows={4}
                maxLength={charLimit}
                disabled={isSubmitting || !selectedProjectId}
                className="resize-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <div className="flex items-center justify-between mt-2">
                <p className={`text-xs transition-colors ${charWarning ? 'text-orange-600 font-medium' : 'text-zinc-500'}`}>
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()} stafir
                  {charWarning && ' - næstum fullur!'}
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newMessage.trim() || !selectedProjectId}
                  size="sm"
                  className="min-w-[100px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sendir...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Senda
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages grouped by project */}
      <div className="space-y-6">
        {Object.entries(messagesByProject)
          .sort((a, b) => {
            const latestA = Math.max(...a[1].messages.map(m => m.created_at ? new Date(m.created_at).getTime() : 0))
            const latestB = Math.max(...b[1].messages.map(m => m.created_at ? new Date(m.created_at).getTime() : 0))
            return latestB - latestA
          })
          .map(([projectId, { project, messages: projectMessages }]) => (
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
                  .map((msg) => {
                    const isOwnMessage = currentUserId && msg.user?.id === currentUserId
                    const isOptimistic = 'isOptimistic' in msg && msg.isOptimistic
                    const isSending = 'isSending' in msg && msg.isSending

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isOwnMessage
                            ? 'bg-blue-50 border-blue-200'
                            : msg.is_read
                            ? 'bg-white border-zinc-200'
                            : 'bg-amber-50 border-amber-300 shadow-sm'
                        } ${isOptimistic ? 'opacity-70' : 'opacity-100'}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="w-4 h-4 text-zinc-400" />
                            <span className="font-medium text-zinc-900 text-sm">
                              {msg.user?.full_name || 'Óþekktur notandi'}
                            </span>
                            {msg.user?.role && msg.user.role !== 'current_user' && (
                              <Badge
                                variant="secondary"
                                className={`${roleColors[msg.user.role] || 'bg-zinc-100 text-zinc-600'} text-xs`}
                              >
                                {roleLabels[msg.user.role] || msg.user.role}
                              </Badge>
                            )}
                            {isOwnMessage && !isOptimistic && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                Þú
                              </Badge>
                            )}
                            {!msg.is_read && !isOwnMessage && !isOptimistic && (
                              <Badge variant="default" className="text-xs bg-amber-600 hover:bg-amber-700">
                                Ólesið
                              </Badge>
                            )}
                            {isSending && (
                              <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Sendir...
                              </Badge>
                            )}
                            {isOptimistic && !isSending && (
                              <Badge variant="outline" className="text-xs border-green-400 text-green-700">
                                <CheckCheck className="w-3 h-3 mr-1" />
                                Sent
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            <time title={msg.created_at ? new Date(msg.created_at).toLocaleString('is-IS') : ''}>
                              {getRelativeTime(msg.created_at)}
                            </time>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap ml-6 leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    )
                  })}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
