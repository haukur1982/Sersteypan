import { z } from 'zod'
import {
  safeStringSchema,
  optionalStringSchema,
  uuidSchema,
  optionalDateStringSchema
} from './common'

/**
 * Project validation schemas
 */

export const projectStatusSchema = z.enum(['planning', 'active', 'completed', 'on_hold'], {
  message: 'Ógild staða verkefnis'
})

export const projectCreateSchema = z.object({
  name: safeStringSchema(2, 200).describe('Nafn verkefnis'),
  company_id: uuidSchema.describe('Fyrirtæki'),
  address: optionalStringSchema(300).describe('Heimilisfang'),
  description: optionalStringSchema(5000).describe('Lýsing'),
  status: projectStatusSchema.default('planning'),
  start_date: optionalDateStringSchema.describe('Upphafsdagsetning'),
  expected_end_date: optionalDateStringSchema.describe('Áætluð lokadagsetning'),
  actual_end_date: optionalDateStringSchema.describe('Raunveruleg lokadagsetning'),
  notes: optionalStringSchema(5000).describe('Athugasemdir')
}).refine(
  (data) => {
    // If both dates exist, start must be before or equal to end
    if (data.start_date && data.expected_end_date) {
      return new Date(data.start_date) <= new Date(data.expected_end_date)
    }
    return true
  },
  {
    message: 'Upphafsdagsetning verður að vera á undan áætlaðri lokadagsetningu',
    path: ['expected_end_date']
  }
)

export const projectUpdateSchema = z.object({
  id: uuidSchema,
  name: safeStringSchema(2, 200).optional(),
  company_id: uuidSchema.optional(),
  address: optionalStringSchema(300),
  description: optionalStringSchema(5000),
  status: projectStatusSchema.optional(),
  start_date: optionalDateStringSchema,
  expected_end_date: optionalDateStringSchema,
  actual_end_date: optionalDateStringSchema,
  notes: optionalStringSchema(5000)
}).refine(
  (data) => {
    if (data.start_date && data.expected_end_date) {
      return new Date(data.start_date) <= new Date(data.expected_end_date)
    }
    return true
  },
  {
    message: 'Upphafsdagsetning verður að vera á undan áætlaðri lokadagsetningu',
    path: ['expected_end_date']
  }
)

export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>

export function validateProjectCreate(data: unknown) {
  return projectCreateSchema.safeParse(data)
}

export function validateProjectUpdate(data: unknown) {
  return projectUpdateSchema.safeParse(data)
}
