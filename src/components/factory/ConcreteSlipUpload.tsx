'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Upload, Loader2, CheckCircle, X } from 'lucide-react'
import { uploadConcreteSlip } from '@/lib/factory/batch-actions'

interface ConcreteSlipUploadProps {
  batchId: string
  existingUrl?: string | null
  existingName?: string | null
  disabled?: boolean
}

export function ConcreteSlipUpload({
  batchId,
  existingUrl,
  existingName,
  disabled = false,
}: ConcreteSlipUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl || null)
  const [uploadedName, setUploadedName] = useState<string | null>(existingName || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasSlip = !!uploadedUrl

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Aðeins PDF og myndir eru leyfðar')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Skrá má ekki vera stærri en 10MB')
      return
    }

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadConcreteSlip(batchId, formData)

    if (result.error) {
      setError(result.error)
    } else {
      setUploadedUrl('uploaded') // Will be refreshed on revalidate
      setUploadedName(file.name)
    }

    setUploading(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (hasSlip) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-3 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900">Steypuskýrsla hlaðin upp</p>
            {uploadedUrl && uploadedUrl !== 'uploaded' ? (
              <a
                href={`/api/batches/${batchId}/concrete-slip`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:underline truncate block"
              >
                {uploadedName || 'Sækja skjal'}
              </a>
            ) : (
              <p className="text-sm text-green-700 truncate">{uploadedName}</p>
            )}
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUploadedUrl(null)
                setUploadedName(null)
              }}
              className="text-green-700 hover:text-green-900"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-200 border-dashed">
      <CardContent className="py-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileText className="h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-600">Hlaða upp steypuskýrslu (PDF eða mynd)</p>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleUpload}
            className="hidden"
            disabled={disabled || uploading}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Hleð upp...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Velja skrá
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
