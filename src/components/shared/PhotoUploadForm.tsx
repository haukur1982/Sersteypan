'use client'

import { useState, useCallback } from 'react'
import { uploadElementPhoto } from '@/lib/elements/actions'
import { Button } from '@/components/ui/button'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface PhotoUploadFormProps {
  elementId: string
  stage: 'rebar' | 'cast' | 'curing' | 'ready' | 'loaded' | 'before_delivery' | 'after_delivery'
  onUploadComplete?: (photoUrl: string) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  className?: string
}

interface UploadingFile {
  file: File
  preview: string
  progress: number
  error?: string
}

export function PhotoUploadForm({
  elementId,
  stage,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  className = ''
}: PhotoUploadFormProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPEG, PNG, WebP, or HEIC images.'
    }
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return `File too large. Maximum size is 10MB, got ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
    }
    return null
  }

  // Upload a single file via server action
  const uploadFile = useCallback(async (uploadingFile: UploadingFile) => {
    console.log(`[photo-upload] PhotoForm: file=${uploadingFile.file.name}, type=${uploadingFile.file.type}, size=${(uploadingFile.file.size / 1024).toFixed(0)}KB, element=${elementId}, stage=${stage}`)

    try {
      // Update progress to 25% (starting upload)
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === uploadingFile.file ? { ...f, progress: 25 } : f
        )
      )

      // Use server action — handles both storage upload and DB insert server-side
      const formData = new FormData()
      formData.append('elementId', elementId)
      formData.append('stage', stage)
      formData.append('file', uploadingFile.file)

      console.log('[photo-upload] Calling uploadElementPhoto server action...')
      const result = await uploadElementPhoto(formData)

      if (result.error) {
        console.error('[photo-upload] Server action failed:', result.error)
        throw new Error(result.error)
      }
      console.log('[photo-upload] Upload complete!')

      // Update progress to 100%
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === uploadingFile.file ? { ...f, progress: 100 } : f
        )
      )

      // Call success callback
      if ('photoUrl' in result && result.photoUrl) {
        onUploadComplete?.(result.photoUrl)
      }

      // Remove from uploading list after 1 second
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.file !== uploadingFile.file))
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      console.error('[photo-upload] PhotoForm error:', errorMessage)

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === uploadingFile.file
            ? { ...f, error: errorMessage, progress: 0 }
            : f
        )
      )

      onUploadError?.(errorMessage)
    }
  }, [elementId, stage, onUploadComplete, onUploadError])

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      if (uploadingFiles.length + files.length > maxFiles) {
        onUploadError?.(`Maximum ${maxFiles} photos allowed`)
        return
      }

      const newFiles: UploadingFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const error = validateFile(file)

        if (error) {
          onUploadError?.(error)
          continue
        }

        const preview = URL.createObjectURL(file)
        newFiles.push({ file, preview, progress: 0, error: undefined })
      }

      if (newFiles.length === 0) return

      setUploadingFiles((prev) => [...prev, ...newFiles])

      for (const uploadingFile of newFiles) {
        await uploadFile(uploadingFile)
      }
    },
    [uploadingFiles.length, maxFiles, onUploadError, uploadFile]
  )

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      handleFileSelect(files)
    },
    [handleFileSelect]
  )

  // Remove file from uploading list
  const removeFile = (uploadingFile: UploadingFile) => {
    URL.revokeObjectURL(uploadingFile.preview)
    setUploadingFiles((prev) => prev.filter((f) => f !== uploadingFile))
  }

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-zinc-300 hover:border-zinc-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="photo-upload"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={uploadingFiles.length >= maxFiles}
        />

        <label
          htmlFor="photo-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              JPEG, PNG, WebP up to 10MB
            </p>
            <p className="text-xs text-zinc-500">
              Maximum {maxFiles} photos
            </p>
          </div>
        </label>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-lg"
            >
              {/* Preview */}
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-100 rounded overflow-hidden">
                {uploadingFile.preview ? (
                  <Image
                    src={uploadingFile.preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-zinc-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {(uploadingFile.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>

                {/* Progress */}
                {!uploadingFile.error && uploadingFile.progress < 100 && (
                  <div className="mt-2">
                    <div className="w-full bg-zinc-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success */}
                {uploadingFile.progress === 100 && (
                  <p className="text-xs text-green-600 mt-1">Upload complete!</p>
                )}

                {/* Error */}
                {uploadingFile.error && (
                  <p className="text-xs text-red-600 mt-1">{uploadingFile.error}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                {uploadingFile.progress > 0 && uploadingFile.progress < 100 ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadingFile)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
