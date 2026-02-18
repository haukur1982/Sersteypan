'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Files } from 'lucide-react'
import { DocumentUploadForm } from './DocumentUploadForm'
import { MultiDocumentUploadForm } from './MultiDocumentUploadForm'

interface BuildingOption {
  id: string
  name: string
  floors: number | null
}

interface DocumentUploadTabsProps {
  projectId: string
  elements?: Array<{ id: string; name: string }>
  buildings?: BuildingOption[]
}

export function DocumentUploadTabs({
  projectId,
  elements,
  buildings,
}: DocumentUploadTabsProps) {
  const [mode, setMode] = useState<'single' | 'multi'>('single')

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-foreground flex-1">Hlaða upp skjali</h3>
        <div className="flex gap-1 bg-muted rounded-md p-0.5">
          <Button
            variant={mode === 'single' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('single')}
            className="h-7 text-xs gap-1"
          >
            <Upload className="h-3 w-3" />
            Eitt
          </Button>
          <Button
            variant={mode === 'multi' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('multi')}
            className="h-7 text-xs gap-1"
          >
            <Files className="h-3 w-3" />
            Mörg
          </Button>
        </div>
      </div>

      {mode === 'single' ? (
        <DocumentUploadForm
          projectId={projectId}
          elements={elements}
          buildings={buildings}
        />
      ) : (
        <MultiDocumentUploadForm
          projectId={projectId}
          buildings={buildings}
        />
      )}
    </div>
  )
}
