'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, X, LayoutGrid, Table2 } from 'lucide-react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { FiligranFloorPlan } from './FiligranFloorPlan'
import type { ExtractedElement, SlabArea } from '@/lib/schemas/drawing-analysis'
import type { BuildingFloorGeometry } from '@/lib/building-geometry/types'

type ActiveView = 'floorplan' | 'pdf' | 'table'

interface FloorPlanReviewLayoutProps {
  /** All extracted elements (including those with position data) */
  elements: ExtractedElement[]
  /** Slab area bounding box from the BF analysis */
  slabArea: SlabArea
  /** Optional building geometry for wall overlay */
  geometry?: BuildingFloorGeometry
  /** Document ID for PDF fallback view */
  documentId: string
  /** The element review table (rendered as children) */
  children: React.ReactNode
  /** Callback to sync highlighted element between floor plan and table */
  highlightedElement: string | null
  onHighlightChange: (name: string | null) => void
}

/**
 * Layout wrapper for BF (filigran) analysis review pages.
 *
 * Shows an interactive SVG floor plan alongside the element review table,
 * with linked hover/click interactions. Falls back to PDF view if the user
 * prefers the original drawing.
 *
 * Desktop: floor plan (left) + table (right) in resizable panels
 * Mobile: toggle between floor plan, PDF, and table views
 */
export function FloorPlanReviewLayout({
  elements,
  slabArea,
  geometry,
  documentId,
  children,
  highlightedElement,
  onHighlightChange,
}: FloorPlanReviewLayoutProps) {
  const [desktopLeftView, setDesktopLeftView] = useState<'floorplan' | 'pdf'>('floorplan')
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [mobileView, setMobileView] = useState<ActiveView>('floorplan')

  const pdfUrl = `/api/documents/${documentId}`

  const handleElementClick = useCallback(
    (name: string) => {
      onHighlightChange(name)
      // Brief highlight then clear after a short delay
      setTimeout(() => onHighlightChange(null), 3000)
    },
    [onHighlightChange]
  )

  const handleElementHover = useCallback(
    (name: string | null) => {
      onHighlightChange(name)
    },
    [onHighlightChange]
  )

  // ─── Collapsed state: table only with buttons to show panels ───
  if (!showLeftPanel) {
    return (
      <div>
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDesktopLeftView('floorplan')
              setShowLeftPanel(true)
            }}
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Plötuyfirlit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDesktopLeftView('pdf')
              setShowLeftPanel(true)
            }}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Teikning
          </Button>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div>
      {/* ─── Desktop: side-by-side resizable panels ─── */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-3">
          {/* Left panel view toggle */}
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
            <button
              onClick={() => setDesktopLeftView('floorplan')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                desktopLeftView === 'floorplan'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Plötuyfirlit
            </button>
            <button
              onClick={() => setDesktopLeftView('pdf')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                desktopLeftView === 'pdf'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Teikning
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeftPanel(false)}
          >
            <X className="mr-1 h-4 w-4" />
            Loka
          </Button>
        </div>

        <div style={{ height: 'calc(100vh - 220px)' }}>
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize={48} minSize={25}>
              <div className="h-full overflow-hidden">
                {desktopLeftView === 'floorplan' ? (
                  <FiligranFloorPlan
                    elements={elements}
                    slabArea={slabArea}
                    geometry={geometry}
                    highlightedElement={highlightedElement}
                    onElementClick={handleElementClick}
                    onElementHover={handleElementHover}
                  />
                ) : (
                  <div className="h-full border rounded-lg overflow-hidden bg-zinc-100">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="Teikning"
                    />
                  </div>
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={52} minSize={30}>
              <div className="h-full overflow-auto pl-3">
                {children}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* ─── Mobile: toggle between views ─── */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
            <button
              onClick={() => setMobileView('floorplan')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === 'floorplan'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <LayoutGrid className="inline h-3.5 w-3.5 mr-1" />
              Yfirlit
            </button>
            <button
              onClick={() => setMobileView('pdf')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === 'pdf'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <FileText className="inline h-3.5 w-3.5 mr-1" />
              PDF
            </button>
            <button
              onClick={() => setMobileView('table')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <Table2 className="inline h-3.5 w-3.5 mr-1" />
              Tafla
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLeftPanel(false)}
            className="h-8 w-8 ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {mobileView === 'floorplan' && (
          <div style={{ height: 'calc(100vh - 200px)' }}>
            <FiligranFloorPlan
              elements={elements}
              slabArea={slabArea}
              geometry={geometry}
              highlightedElement={highlightedElement}
              onElementClick={handleElementClick}
              onElementHover={handleElementHover}
            />
          </div>
        )}

        {mobileView === 'pdf' && (
          <div
            className="border rounded-lg overflow-hidden bg-zinc-100"
            style={{ height: 'calc(100vh - 200px)' }}
          >
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Teikning"
            />
          </div>
        )}

        {mobileView === 'table' && children}
      </div>
    </div>
  )
}
