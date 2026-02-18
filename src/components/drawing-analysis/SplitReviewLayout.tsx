'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, X, PanelLeftClose, PanelLeft } from 'lucide-react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

interface SplitReviewLayoutProps {
  documentId: string
  children: React.ReactNode
}

/**
 * Side-by-side layout: PDF viewer on the left, review table on the right.
 * Toggle button to show/hide the PDF panel.
 * On mobile, shows a toggle to switch between PDF and table views.
 */
export function SplitReviewLayout({
  documentId,
  children,
}: SplitReviewLayoutProps) {
  const [showPdf, setShowPdf] = useState(false)
  // Mobile: which view is active when PDF is shown
  const [mobileView, setMobileView] = useState<'pdf' | 'table'>('table')

  const pdfUrl = `/api/documents/${documentId}`

  if (!showPdf) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => setShowPdf(true)}
          >
            <PanelLeft className="mr-2 h-4 w-4" />
            Sýna teikningu
          </Button>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div>
      {/* Desktop: side-by-side resizable panels */}
      <div className="hidden md:block">
        <div className="flex items-center justify-end gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPdf(false)}
          >
            <PanelLeftClose className="mr-1 h-4 w-4" />
            Loka teikningu
          </Button>
        </div>
        <div style={{ height: 'calc(100vh - 220px)' }}>
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize={45} minSize={25}>
              <div className="h-full border rounded-lg overflow-hidden bg-zinc-100">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="Teikning"
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={30}>
              <div className="h-full overflow-auto pl-3">
                {children}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Mobile: toggle between PDF and table */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
            <button
              onClick={() => setMobileView('pdf')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === 'pdf'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <FileText className="inline h-3.5 w-3.5 mr-1" />
              Teikning
            </button>
            <button
              onClick={() => setMobileView('table')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              Einingar
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPdf(false)}
            className="h-8 w-8 ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {mobileView === 'pdf' ? (
          <div className="border rounded-lg overflow-hidden bg-zinc-100" style={{ height: 'calc(100vh - 200px)' }}>
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Teikning"
            />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
