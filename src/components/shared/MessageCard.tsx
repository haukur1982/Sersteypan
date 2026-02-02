'use client'

import { User, CheckCheck, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type Message = {
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

export type OptimisticMessage = Message & {
  isOptimistic?: boolean
  isSending?: boolean
  sendError?: string
}

interface MessageCardProps {
  message: OptimisticMessage
  currentUserId?: string
  roleLabels: Record<string, string>
  roleColors: Record<string, string>
  getRelativeTime: (dateString: string | null) => string
}

export function MessageCard({
  message: msg,
  currentUserId,
  roleLabels,
  roleColors,
  getRelativeTime
}: MessageCardProps) {
  const isOwnMessage = currentUserId && msg.user?.id === currentUserId
  const isOptimistic = 'isOptimistic' in msg && msg.isOptimistic
  const isSending = 'isSending' in msg && msg.isSending

  return (
    <div
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
}
