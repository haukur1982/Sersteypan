import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

/**
 * Element type from database
 */
export interface ElementType {
  id: string
  key: string
  label_is: string
  label_en: string
  sort_order: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Get all active element types, ordered by sort_order
 * Uses React cache for request deduplication
 */
export const getElementTypes = cache(async (): Promise<ElementType[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('element_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch element types:', error)
    return []
  }

  return data || []
})

/**
 * Get all element types including inactive (for admin)
 */
export async function getAllElementTypes(): Promise<ElementType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('element_types')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch all element types:', error)
    return []
  }

  return data || []
}

/**
 * Get just the keys of active element types (for validation)
 * Uses React cache for request deduplication
 */
export const getElementTypeKeys = cache(async (): Promise<string[]> => {
  const types = await getElementTypes()
  return types.map(t => t.key)
})

/**
 * Get element type by key
 */
export async function getElementTypeByKey(key: string): Promise<ElementType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('element_types')
    .select('*')
    .eq('key', key)
    .single()

  if (error) {
    console.error('Failed to fetch element type:', error)
    return null
  }

  return data
}

/**
 * Create a new element type (admin only)
 */
export async function createElementType(
  type: Omit<ElementType, 'id' | 'created_at' | 'updated_at'>
): Promise<ElementType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('element_types')
    .insert(type)
    .select()
    .single()

  if (error) {
    console.error('Failed to create element type:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Update an element type (admin only)
 */
export async function updateElementType(
  id: string,
  updates: Partial<Omit<ElementType, 'id' | 'created_at' | 'updated_at'>>
): Promise<ElementType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('element_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update element type:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Soft delete an element type (set is_active = false)
 */
export async function deactivateElementType(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('element_types')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Failed to deactivate element type:', error)
    throw new Error(error.message)
  }

  return true
}
