'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react'
import { uploadDocument } from '@/lib/documents/actions'
import { startDrawingAnalysis } from '@/lib/drawing-analysis/actions'

export function DrawingUploadZone({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf'
    )

    if (droppedFiles.length === 0) {
      setError('Aðeins PDF skjöl eru leyfileg.')
      return
    }

    setFiles((prev) => [...prev, ...droppedFiles])
    setError(null)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).filter(
        (f) => f.type === 'application/pdf'
      )

      if (selectedFiles.length === 0) {
        setError('Aðeins PDF skjöl eru leyfileg.')
        return
      }

      setFiles((prev) => [...prev, ...selectedFiles])
      setError(null)
    },
    []
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUploadAndAnalyze = async () => {
    if (files.length === 0) return
    setUploading(true)
    setError(null)

    try {
      // Step 1: Upload each file as a project document
      const documentIds: string[] = []

      for (const file of files) {
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 'Hleð upp...',
        }))

        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', 'drawing')

        const result = await uploadDocument(projectId, formData)

        if (result.error || !result.documentId) {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: `Villa: ${result.error || 'Óþekkt villa'}`,
          }))
          continue
        }

        documentIds.push(result.documentId)
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 'Hlaðið upp ✓',
        }))
      }

      if (documentIds.length === 0) {
        setError('Ekki tókst að hlaða upp neinum skjölum.')
        setUploading(false)
        return
      }

      // Step 2: Start AI analysis for all uploaded documents
      setUploadProgress((prev) => {
        const updated = { ...prev }
        for (const file of files) {
          if (updated[file.name] === 'Hlaðið upp ✓') {
            updated[file.name] = 'AI greining hefst...'
          }
        }
        return updated
      })

      const analysisResult = await startDrawingAnalysis(projectId, documentIds)

      if (analysisResult.error) {
        setError(analysisResult.error)
        setUploading(false)
        return
      }

      // Step 3: Trigger the AI analysis API for each
      // Refresh immediately so analysis cards appear as "Í biðröð"
      setFiles([])
      setUploadProgress({})
      router.refresh()

      if (analysisResult.analyses) {
        for (const analysis of analysisResult.analyses) {
          try {
            const resp = await fetch('/api/ai/analyze-drawing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId: analysis.documentId,
                projectId,
                analysisId: analysis.id,
              }),
            })

            if (!resp.ok) {
              const errData = await resp.json().catch(() => ({}))
              const errMsg = errData.error || `Villa ${resp.status}`
              console.error('Analysis API error:', errMsg)
              setError(errMsg)
            }
          } catch (err) {
            console.error('Error triggering analysis:', err)
            setError('Ekki tókst að ræsa AI greiningu. Athugaðu stillingar.')
          }

          // Refresh after each analysis completes/fails so cards update
          router.refresh()
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Óvænt villa kom upp. Reyndu aftur.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-purple-400 bg-purple-50'
            : 'border-zinc-300 hover:border-purple-300 hover:bg-purple-50/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center">
            <Upload
              className={`h-10 w-10 mb-3 ${
                isDragging ? 'text-purple-600' : 'text-zinc-400'
              }`}
            />
            <p className="text-sm font-medium text-zinc-700 mb-1">
              Dragðu PDF teikningar hingað
            </p>
            <p className="text-xs text-zinc-500 mb-3">
              eða smelltu til að velja skjöl
            </p>
            <label>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                className="cursor-pointer"
              >
                <span>Velja skjöl</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files List */}
      {files.length > 0 && (
        <Card className="border-zinc-200">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2 rounded bg-zinc-50"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-zinc-700 truncate max-w-[250px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-zinc-400">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress[file.name] && (
                      <span className="text-xs text-zinc-500">
                        {uploadProgress[file.name]}
                      </span>
                    )}
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={uploading || files.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Greining í gangi...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Hlaða upp og greina ({files.length}{' '}
                    {files.length === 1 ? 'skjal' : 'skjöl'})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
