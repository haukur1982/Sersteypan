import { z } from 'zod'
import {
  safeStringSchema,
  optionalStringSchema,
  uuidSchema,
  dateStringSchema
} from './common'

/**
 * Diary entry validation schemas
 */

export const diaryCreateSchema = z.object({
  title: optionalStringSchema(200).describe('Titill'),
  content: safeStringSchema(1, 10000).describe('Innihald'),
  entry_date: dateStringSchema.describe('Dagsetning'),
  project_id: uuidSchema.optional().or(z.literal('')).transform((val) => val || undefined).describe('Verkefni')
})

export const diaryUpdateSchema = diaryCreateSchema.extend({
  id: uuidSchema
})

export type DiaryCreateInput = z.infer<typeof diaryCreateSchema>
export type DiaryUpdateInput = z.infer<typeof diaryUpdateSchema>

export function validateDiaryCreate(data: unknown) {
  return diaryCreateSchema.safeParse(data)
}

export function validateDiaryUpdate(data: unknown) {
  return diaryUpdateSchema.safeParse(data)
}
