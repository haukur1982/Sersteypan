'use client'

import { useState } from 'react'
import { Download, Calendar, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'
import { DocumentPreview } from '@/components/documents/DocumentPreview'

const categoryConfig: Record<string, { label: string; color: string }> = {
  drawing: { label: 'Teikning', color: 'bg-blue-100 text-blue-800' },
  rebar: { label: 'Armering', color: 'bg-orange-100 text-orange-800' },
  concrete_spec: { label: 'Steypuskýrsla', color: 'bg-green-100 text-green-800' },
  other: { label: 'Annað', color: 'bg-zinc-100 text-zinc-600' },
}

type Document = {
  id: string
  name: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size_bytes: number | null
  category?: string
  created_at: string | null
}

interface DocumentsTabProps {
  documents: Document[]
}

export function DocumentsTab({ documents }: DocumentsTabProps) {
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

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

  // Count categories
  const hasCategories = documents.some(d => d.category)
  const categoryCounts: Record<string, number> = {}
  for (const doc of documents) {
    const cat = doc.category || 'other'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }

  const filtered = activeFilter
    ? documents.filter(d => (d.category || 'other') === activeFilter)
    : documents

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Óþekkt stærð'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      {/* Category filter tabs */}
      {hasCategories && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Button
            variant={activeFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(null)}
            className="h-7 text-xs"
          >
            Allt ({documents.length})
          </Button>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = categoryCounts[key]
            if (!count) return null
            return (
              <Button
                key={key}
                variant={activeFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(key)}
                className="h-7 text-xs"
              >
                {config.label} ({count})
              </Button>
            )
          })}
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm divide-y divide-zinc-200">
        {filtered.map((doc) => {
          const catInfo = doc.category ? categoryConfig[doc.category] || categoryConfig.other : null
          return (
            <div key={doc.id} className="p-6 hover:bg-zinc-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex items-start gap-3 flex-1 text-left"
                >
                  <FileText className="w-8 h-8 text-zinc-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-zinc-900 truncate">
                        {doc.name}
                      </h4>
                      <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      {catInfo && (
                        <Badge variant="secondary" className={`${catInfo.color} border-0 text-[10px] px-1.5 py-0`}>
                          {catInfo.label}
                        </Badge>
                      )}
                    </div>
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
                </button>

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
          )
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Engin skjöl í þessum flokki
          </div>
        )}
      </div>

      {/* Document preview dialog */}
      <DocumentPreview
        document={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null) }}
      />
    </>
  )
}
