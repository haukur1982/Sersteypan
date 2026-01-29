'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { sendMessage } from '@/lib/buyer/actions'

type Message = {
  id: string
  message: string
  is_read: boolean
  created_at: string
  user: {
    id: string
    full_name: string
    role: string
  } | null
}

interface MessagesTabProps {
  messages: Message[]
  projectId: string
}

export function MessagesTab({ messages, projectId }: MessagesTabProps) {
  const router = useRouter()
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('message', newMessage)

    const result = await sendMessage(formData)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setNewMessage('')
      setIsSubmitting(false)
      router.refresh()  // Refresh to show new message
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Stjórnandi',
    factory_manager: 'Framleiðslustjóri',
    buyer: 'Kaupandi',
    driver: 'Bílstjóri'
  }

  return (
    <div className="space-y-6">
      {/* Message Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
        <h3 className="font-medium text-zinc-900 mb-4">Senda skilaboð</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Skrifaðu skilaboð til framleiðslustjóra..."
          rows={4}
          maxLength={5000}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-zinc-500">
            {newMessage.length}/5000
          </p>
          <Button type="submit" disabled={isSubmitting || !newMessage.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sendir...' : 'Senda'}
          </Button>
        </div>
      </form>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-6 py-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Engin skilaboð</p>
          <p className="text-sm text-zinc-400 mt-1">
            Engin skilaboð hafa verið send um þetta verkefni
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-medium text-zinc-900">Skilaboðasaga</h3>
          {messages
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((msg) => (
              <div
                key={msg.id}
                className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900">
                        {msg.user?.full_name || 'Óþekktur notandi'}
                      </p>
                      <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                        {roleLabels[msg.user?.role || ''] || msg.user?.role}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                  <time className="text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleDateString('is-IS', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
