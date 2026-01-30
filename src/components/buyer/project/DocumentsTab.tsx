import { FileText, Download, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Document = {
  id: string
  name: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size_bytes: number | null
  created_at: string | null
}

interface DocumentsTabProps {
  documents: Document[]
}

export function DocumentsTab({ documents }: DocumentsTabProps) {
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-6 py-12 text-center">
        <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 font-medium">Engin skjöl</p>
        <p className="text-sm text-zinc-400 mt-1">
          Engin skjöl hafa verið hlaðið upp fyrir þetta verkefni
        </p>
      </div>
    )
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Óþekkt stærð'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string | null): string => {
    if (!fileType) return '📄'
    if (fileType.includes('pdf')) return '📕'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('dwg')) return '📐'
    return '📄'
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm divide-y divide-zinc-200">
      {documents.map((doc) => (
        <div key={doc.id} className="p-6 hover:bg-zinc-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-3xl">{getFileIcon(doc.file_type)}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-zinc-900 truncate">
                  {doc.name}
                </h4>
                {doc.description && (
                  <p className="text-sm text-zinc-600 mt-1">
                    {doc.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  <span>{formatFileSize(doc.file_size_bytes)}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString('is-IS')
                      : 'Óþekkt'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Download className="w-4 h-4 mr-2" />
                Sækja
              </a>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
