'use client'

import { useState } from 'react'
import { uploadDocument } from '@/lib/documents/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'

interface DocumentUploadFormProps {
  projectId: string
}

export function DocumentUploadForm({ projectId }: DocumentUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsUploading(true)
    setError(null)
    setSuccess(null)

    // Capture form reference before async operation
    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const result = await uploadDocument(projectId, formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.message || 'Document uploaded successfully')
        // Reset form safely
        form.reset()
        // Refresh page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="file">Skrá *</Label>
        <Input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx"
          disabled={isUploading}
        />
        <p className="text-xs text-zinc-500">
          PDF, myndir, Excel, eða Word skjöl. Hámark 50MB.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Lýsing</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Valfrjáls lýsing á skjalinu"
          rows={2}
          disabled={isUploading}
        />
      </div>

      <Button type="submit" disabled={isUploading} className="w-full">
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? 'Hleður upp...' : 'Hlaða upp skjali'}
      </Button>
    </form>
  )
}
