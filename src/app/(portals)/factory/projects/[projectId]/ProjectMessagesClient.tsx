'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendFactoryMessage, markMessagesAsRead } from '@/lib/factory/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { User, Clock, Send, Loader2, Box } from 'lucide-react'

interface ProjectMessage {
    id: string
    message: string
    is_read: boolean | null
    created_at: string | null
    user: {
        id: string
        full_name: string
        role: string
    } | null
    element?: {
        id: string
        name: string
        element_type: string
    } | null
}

interface ElementOption {
    id: string
    name: string
    element_type: string
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

const elementTypeColors: Record<string, string> = {
    wall: 'bg-blue-100 text-blue-800 border-blue-200',
    filigran: 'bg-purple-100 text-purple-800 border-purple-200',
    staircase: 'bg-orange-100 text-orange-800 border-orange-200',
    balcony: 'bg-green-100 text-green-800 border-green-200',
    ceiling: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    column: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    beam: 'bg-red-100 text-red-800 border-red-200',
    other: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

interface ProjectMessagesClientProps {
    projectId: string
    messages: ProjectMessage[]
    currentUserId: string
    elements?: ElementOption[]
}

export function ProjectMessagesClient({ projectId, messages: serverMessages, currentUserId, elements }: ProjectMessagesClientProps) {
    const router = useRouter()
    const [newMessage, setNewMessage] = useState('')
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Real-time subscription
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel(`project-messages-${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_messages',
                    filter: `project_id=eq.${projectId}`
                },
                () => {
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [projectId, router])

    // Mark unread messages as read
    useEffect(() => {
        const unreadIds = serverMessages
            .filter(m => !m.is_read && m.user?.id !== currentUserId)
            .map(m => m.id)

        if (unreadIds.length > 0) {
            markMessagesAsRead(unreadIds)
        }
    }, [serverMessages, currentUserId])

    const handleSend = async () => {
        if (!newMessage.trim() || isSubmitting) return

        setIsSubmitting(true)
        setError(null)

        const formData = new FormData()
        formData.append('projectId', projectId)
        formData.append('message', newMessage.trim())
        if (selectedElementId) formData.append('elementId', selectedElementId)

        const result = await sendFactoryMessage(formData)

        if (result.error) {
            setError(result.error)
        } else {
            setNewMessage('')
            setSelectedElementId(null)
            router.refresh()
        }

        setIsSubmitting(false)
    }

    // Sort messages oldest first for chat-like display
    const sortedMessages = [...serverMessages].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeA - timeB
    })

    return (
        <div className="space-y-4">
            {/* Messages list */}
            {sortedMessages.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {sortedMessages.map((msg) => {
                        const isOwnMessage = msg.user?.id === currentUserId
                        return (
                            <div
                                key={msg.id}
                                className={`p-3 rounded-lg border ${
                                    isOwnMessage
                                        ? 'bg-blue-50 border-blue-200'
                                        : msg.is_read
                                        ? 'bg-white border-border'
                                        : 'bg-amber-50 border-amber-300'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="font-medium text-sm text-foreground">
                                            {msg.user?.full_name || 'Óþekktur'}
                                        </span>
                                        {msg.user?.role && (
                                            <Badge variant="secondary" className={`${roleColors[msg.user.role] || 'bg-zinc-100 text-zinc-600'} text-xs`}>
                                                {roleLabels[msg.user.role] || msg.user.role}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {getRelativeTime(msg.created_at)}
                                    </div>
                                </div>
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap ml-5.5 pl-0.5">
                                    {msg.message}
                                </p>
                                {msg.element && (
                                    <div className="ml-5.5 pl-0.5 mt-1.5">
                                        <Link href={`/factory/production/${msg.element.id}`} className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                            <Badge
                                                variant="outline"
                                                className={`${elementTypeColors[msg.element.element_type] || elementTypeColors.other} text-xs gap-1`}
                                            >
                                                <Box className="w-3 h-3" />
                                                {msg.element.name}
                                            </Badge>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                    Engin skilaboð ennþá fyrir þetta verkefni.
                </p>
            )}

            {/* Reply form */}
            <div className="space-y-2 pt-2 border-t border-border">
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        {error}
                    </div>
                )}
                {elements && elements.length > 0 && (
                    <select
                        value={selectedElementId || ''}
                        onChange={(e) => setSelectedElementId(e.target.value || null)}
                        className="w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSubmitting}
                    >
                        <option value="">Eining (valfrjálst)...</option>
                        {elements.map((el) => (
                            <option key={el.id} value={el.id}>
                                {el.name}
                            </option>
                        ))}
                    </select>
                )}
                <Textarea
                    placeholder="Skrifa skilaboð..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSend()
                        }
                    }}
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Ctrl+Enter til að senda</span>
                    <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSubmitting}
                        size="sm"
                    >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Senda
                    </Button>
                </div>
            </div>
        </div>
    )
}
