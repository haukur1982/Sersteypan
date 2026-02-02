import { z } from 'zod'
import {
  safeStringSchema,
  optionalStringSchema,
  uuidSchema,
  optionalDateStringSchema,
  prioritySchema
} from './common'

/**
 * Todo item validation schemas
 */

export const todoCreateSchema = z.object({
  title: safeStringSchema(1, 200).describe('Titill'),
  description: optionalStringSchema(2000).describe('Lýsing'),
  due_date: optionalDateStringSchema.describe('Skiladagur'),
  priority: prioritySchema.describe('Forgangur'),
  project_id: uuidSchema.optional().or(z.literal('')).transform((val) => val || undefined).describe('Verkefni')
})

export const todoUpdateSchema = todoCreateSchema.extend({
  id: uuidSchema
})

export const todoToggleSchema = z.object({
  id: uuidSchema,
  is_completed: z.boolean()
})

export type TodoCreateInput = z.infer<typeof todoCreateSchema>
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>
export type TodoToggleInput = z.infer<typeof todoToggleSchema>

export function validateTodoCreate(data: unknown) {
  return todoCreateSchema.safeParse(data)
}

export function validateTodoUpdate(data: unknown) {
  return todoUpdateSchema.safeParse(data)
}

export function validateTodoToggle(data: unknown) {
  return todoToggleSchema.safeParse(data)
}
