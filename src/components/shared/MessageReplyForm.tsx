'use client'

import { useRef } from 'react'
import { Send, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Project {
  id: string
  name: string
  company: {
    id: string
    name: string
  } | null
}

interface MessageReplyFormProps {
  projects: Array<{ projectId: string; project: Project | null }>
  selectedProjectId: string | null
  onProjectSelect: (projectId: string) => void
  newMessage: string
  onMessageChange: (message: string) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  error: string | null
  onErrorClear: () => void
}

const CHAR_LIMIT = 5000

export function MessageReplyForm({
  projects,
  selectedProjectId,
  onProjectSelect,
  newMessage,
  onMessageChange,
  onSubmit,
  isSubmitting,
  error,
  onErrorClear
}: MessageReplyFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = newMessage.length
  const charWarning = charCount > 4500

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onProjectSelect(e.target.value)
    onErrorClear()
    // Focus textarea after selecting project
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
      e.preventDefault()
      void onSubmit()
    }
  }

  const handleSubmitClick = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Senda skilaboð</CardTitle>
        <CardDescription>
          Veldu verkefni og skrifaðu skilaboð. Ýttu á{' '}
          <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-xs">Ctrl</kbd> +{' '}
          <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-xs">Enter</kbd>{' '}
          til að senda.
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
            onChange={handleProjectChange}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isSubmitting}
          >
            <option value="">Veldu verkefni...</option>
            {projects.map(({ projectId, project }) => (
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
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skrifaðu skilaboð..."
            rows={4}
            maxLength={CHAR_LIMIT}
            disabled={isSubmitting || !selectedProjectId}
            className="resize-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs transition-colors ${charWarning ? 'text-orange-600 font-medium' : 'text-zinc-500'}`}>
              {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()} stafir
              {charWarning && ' - næstum fullur!'}
            </p>
            <Button
              onClick={handleSubmitClick}
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
  )
}
