'use client'

import { useState } from 'react'
import { FloorPlanReviewLayout } from './FloorPlanReviewLayout'
import { ElementReviewTable } from './ElementReviewTable'
import type { ExtractedElement, SlabArea } from '@/lib/schemas/drawing-analysis'
import type { BuildingFloorGeometry } from '@/lib/building-geometry/types'

/**
 * Client wrapper that manages shared highlight state between
 * the floor plan visualization and the element review table.
 *
 * This exists because both FiligranFloorPlan and ElementReviewTable
 * need to share `highlightedElement` state, which requires a common
 * client-side parent.
 */
export function FiligranReviewSection({
  elements,
  slabArea,
  geometry,
  documentId,
  analysisId,
  projectId,
  buildings,
  existingNames,
  isCommitted,
}: {
  elements: ExtractedElement[]
  slabArea: SlabArea
  geometry?: BuildingFloorGeometry
  documentId: string
  analysisId: string
  projectId: string
  buildings: { id: string; name: string; floors: number | null }[]
  existingNames: string[]
  isCommitted: boolean
}) {
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null)

  return (
    <FloorPlanReviewLayout
      elements={elements}
      slabArea={slabArea}
      geometry={geometry}
      documentId={documentId}
      highlightedElement={highlightedElement}
      onHighlightChange={setHighlightedElement}
    >
      <ElementReviewTable
        analysisId={analysisId}
        projectId={projectId}
        elements={elements}
        buildings={buildings}
        existingNames={existingNames}
        isCommitted={isCommitted}
        highlightedElement={highlightedElement}
        onElementHover={setHighlightedElement}
        onElementClick={(name) => {
          setHighlightedElement(name)
          setTimeout(() => setHighlightedElement(null), 3000)
        }}
      />
    </FloorPlanReviewLayout>
  )
}
