'use client'

import { useState, useRef, useCallback } from 'react'
import { uploadDocument } from '@/lib/documents/actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react'

interface BuildingOption {
  id: string
  name: string
  floors: number | null
}

interface MultiDocumentUploadFormProps {
  projectId: string
  buildings?: BuildingOption[]
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface FileEntry {
  id: string
  file: File
  status: FileStatus
  error?: string
}

export function MultiDocumentUploadForm({
  projectId,
  buildings,
}: MultiDocumentUploadFormProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [category, setCategory] = useState('other')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedBuildingData = buildings?.find((b) => b.id === selectedBuilding)
  const maxFloors = selectedBuildingData?.floors || 99

  const handleFilesSelected = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return

      const newEntries: FileEntry[] = Array.from(selectedFiles).map(
        (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          status: 'pending' as FileStatus,
        })
      )

      setFiles((prev) => [...prev, ...newEntries])
    },
    []
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFilesSelected(e.dataTransfer.files)
    },
    [handleFilesSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  async function handleUploadAll() {
    if (files.length === 0) return
    setUploading(true)

    // Upload sequentially to avoid overwhelming the server
    for (const entry of files) {
      if (entry.status === 'done') continue

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: 'uploading' as FileStatus } : f
        )
      )

      try {
        const formData = new FormData()
        formData.append('file', entry.file)
        formData.append('category', category)
        if (selectedBuilding) formData.append('building_id', selectedBuilding)
        if (floor) formData.append('floor', floor)

        const result = await uploadDocument(projectId, formData)

        if (result.error) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'error' as FileStatus, error: result.error }
                : f
            )
          )
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: 'done' as FileStatus } : f
            )
          )
        }
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error' as FileStatus, error: 'Óvænt villa' }
              : f
          )
        )
      }
    }

    setUploading(false)

    // Check if all succeeded — reload
    setFiles((prev) => {
      const allDone = prev.every((f) => f.status === 'done')
      if (allDone) {
        setTimeout(() => window.location.reload(), 1000)
      }
      return prev
    })
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const doneCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm text-zinc-600">
          Dragðu skjöl hingað eða <span className="text-blue-600 font-medium">veldu skjöl</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          PDF, myndir, Excel, Word. Hámark 50MB á skjal.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.dwg"
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Global settings */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Flokkur</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
              className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-sm"
            >
              <option value="drawing">Teikning</option>
              <option value="rebar">Armeringsmynd</option>
              <option value="concrete_spec">Steypuskýrsla</option>
              <option value="other">Annað</option>
            </select>
          </div>
          {buildings && buildings.length > 0 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Bygging</Label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  disabled={uploading}
                  className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-sm"
                >
                  <option value="">— Engin</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hæð</Label>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  min="0"
                  max={maxFloors}
                  placeholder="—"
                  disabled={uploading || !selectedBuilding}
                  className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-sm"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 max-h-64 overflow-y-auto">
          {files.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 px-3 py-2 ${
                entry.status === 'done'
                  ? 'bg-green-50'
                  : entry.status === 'error'
                  ? 'bg-red-50'
                  : ''
              }`}
            >
              {entry.status === 'uploading' ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
              ) : entry.status === 'done' ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : entry.status === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-900 truncate">{entry.file.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatFileSize(entry.file.size)}
                  {entry.error && (
                    <span className="text-red-600 ml-2">{entry.error}</span>
                  )}
                </p>
              </div>
              {entry.status !== 'uploading' && entry.status !== 'done' && (
                <button
                  type="button"
                  onClick={() => removeFile(entry.id)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button + stats */}
      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2 text-xs">
            {pendingCount > 0 && (
              <Badge variant="outline">{pendingCount} í bið</Badge>
            )}
            {doneCount > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {doneCount} hlaðið upp
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {errorCount} villa
              </Badge>
            )}
          </div>
          <Button
            onClick={handleUploadAll}
            disabled={uploading || pendingCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Hleð upp...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Hlaða öllu upp ({pendingCount})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
