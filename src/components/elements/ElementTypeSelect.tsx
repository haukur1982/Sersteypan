'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface ElementType {
  id: string
  key: string
  label_is: string
  label_en: string
  sort_order: number
  is_active: boolean
}

// Fallback types if API fails (matches database seed)
const FALLBACK_TYPES: ElementType[] = [
  { id: '1', key: 'wall', label_is: 'Veggur', label_en: 'Wall', sort_order: 1, is_active: true },
  { id: '2', key: 'filigran', label_is: 'Filigran', label_en: 'Floor Slab', sort_order: 2, is_active: true },
  { id: '3', key: 'staircase', label_is: 'Stigi', label_en: 'Staircase', sort_order: 3, is_active: true },
  { id: '4', key: 'balcony', label_is: 'Svalir', label_en: 'Balcony', sort_order: 4, is_active: true },
  { id: '5', key: 'ceiling', label_is: 'Þak', label_en: 'Ceiling', sort_order: 5, is_active: true },
  { id: '6', key: 'column', label_is: 'Súla', label_en: 'Column', sort_order: 6, is_active: true },
  { id: '7', key: 'beam', label_is: 'Bita', label_en: 'Beam', sort_order: 7, is_active: true },
  { id: '8', key: 'other', label_is: 'Annað', label_en: 'Other', sort_order: 99, is_active: true },
]

// Cache for element types (client-side)
let cachedTypes: ElementType[] | null = null
let cachePromise: Promise<ElementType[]> | null = null

async function fetchElementTypes(): Promise<ElementType[]> {
  if (cachedTypes) return cachedTypes

  if (cachePromise) return cachePromise

  cachePromise = fetch('/api/element-types')
    .then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      cachedTypes = data
      return data
    })
    .catch(() => {
      console.warn('Failed to fetch element types, using fallback')
      cachedTypes = FALLBACK_TYPES
      return FALLBACK_TYPES
    })
    .finally(() => {
      cachePromise = null
    })

  return cachePromise
}

// Clear cache (useful when admin adds new types)
export function clearElementTypesCache() {
  cachedTypes = null
  cachePromise = null
}

interface ElementTypeSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

/**
 * Reusable select component for element types
 * Fetches types from database API with client-side caching
 */
export function ElementTypeSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Veldu tegund...',
  className,
}: ElementTypeSelectProps) {
  const [types, setTypes] = useState<ElementType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchElementTypes()
      .then(setTypes)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Skeleton className="h-10 w-full" />
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {types.map((type) => (
          <SelectItem key={type.key} value={type.key}>
            {type.label_is} ({type.label_en})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Hook to get element types for use in other components
 */
export function useElementTypes() {
  const [types, setTypes] = useState<ElementType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchElementTypes()
      .then(setTypes)
      .finally(() => setLoading(false))
  }, [])

  return { types, loading }
}

/**
 * Get display label for an element type key
 */
export function getElementTypeLabel(key: string, types: ElementType[]): string {
  const type = types.find(t => t.key === key)
  return type ? `${type.label_is} (${type.label_en})` : key
}

/**
 * Get Icelandic label only
 */
export function getElementTypeLabelIs(key: string, types: ElementType[]): string {
  const type = types.find(t => t.key === key)
  return type?.label_is ?? key
}
