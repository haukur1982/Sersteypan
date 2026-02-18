'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, X, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateDefectPhotos } from '@/lib/factory/fix-factory-actions'

interface DefectPhoto {
  url: string
  name: string
  uploaded_at: string
}

interface DefectPhotoUploadProps {
  requestId: string
  photos: DefectPhoto[]
  disabled?: boolean
}

const MAX_PHOTOS = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function DefectPhotoUpload({ requestId, photos: initialPhotos, disabled = false }: DefectPhotoUploadProps) {
  const [photos, setPhotos] = useState<DefectPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    e.target.value = '' // Reset input

    // Validate
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Aðeins JPEG, PNG og WebP myndir eru leyfðar')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Mynd má ekki vera stærri en 10MB')
      return
    }
    if (photos.length >= MAX_PHOTOS) {
      setError(`Hámark ${MAX_PHOTOS} myndir per lagfæringu`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Ekki innskráður')
        setUploading(false)
        return
      }
      const fileName = `${user.id}/defects/${requestId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('element-photos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('Villa við að hlaða upp mynd')
        setUploading(false)
        return
      }

      const newPhoto: DefectPhoto = {
        url: fileName,
        name: file.name,
        uploaded_at: new Date().toISOString(),
      }

      const updatedPhotos = [...photos, newPhoto]

      const result = await updateDefectPhotos(requestId, updatedPhotos)

      if (result.error) {
        setError(result.error)
        // Try to delete the uploaded file
        await supabase.storage.from('element-photos').remove([fileName])
      } else {
        setPhotos(updatedPhotos)
      }
    } catch {
      setError('Óvænt villa við upphleðslu')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(index: number) {
    const photo = photos[index]
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Remove from storage
      await supabase.storage.from('element-photos').remove([photo.url])

      // Update DB
      const updatedPhotos = photos.filter((_, i) => i !== index)
      const result = await updateDefectPhotos(requestId, updatedPhotos)

      if (result.error) {
        setError(result.error)
      } else {
        setPhotos(updatedPhotos)
      }
    } catch {
      setError('Villa við að eyða mynd')
    } finally {
      setUploading(false)
    }
  }

  function getPhotoUrl(path: string) {
    const supabase = createClient()
    const { data } = supabase.storage.from('element-photos').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Camera className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-700">
          Myndir ({photos.length}/{MAX_PHOTOS})
        </span>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              className="relative group w-16 h-16 rounded-md overflow-hidden border border-zinc-200 bg-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(photo.url)}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploading}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {!disabled && photos.length < MAX_PHOTOS && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-7 text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Hleð upp...
              </>
            ) : (
              <>
                <ImageIcon className="h-3 w-3 mr-1" />
                Bæta við mynd
              </>
            )}
          </Button>
        </>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
