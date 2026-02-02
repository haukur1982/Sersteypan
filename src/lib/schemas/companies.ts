import { z } from 'zod'
import {
  safeStringSchema,
  optionalStringSchema,
  emailSchema,
  phoneSchema,
  kennitalaSchema,
  uuidSchema
} from './common'

/**
 * Company validation schemas
 */

export const companyCreateSchema = z.object({
  name: safeStringSchema(2, 200).describe('Nafn fyrirtækis'),
  kennitala: kennitalaSchema.describe('Kennitala'),
  address: optionalStringSchema(300).describe('Heimilisfang'),
  postal_code: z
    .string()
    .regex(/^\d{3}$/, 'Póstnúmer verður að vera 3 tölustafir')
    .optional()
    .or(z.literal(''))
    .transform((val) => val || undefined),
  city: optionalStringSchema(100).describe('Borg/Bær'),
  phone: phoneSchema.describe('Símanúmer'),
  email: emailSchema.optional().or(z.literal('')).describe('Netfang'),
  contact_name: optionalStringSchema(200).describe('Tengiliður'),
  contact_email: emailSchema.optional().or(z.literal('')).describe('Netfang tengiliðar'),
  contact_phone: phoneSchema.describe('Símanúmer tengiliðar'),
  notes: optionalStringSchema(2000).describe('Athugasemdir')
})

export const companyUpdateSchema = companyCreateSchema.partial().extend({
  id: uuidSchema
})

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>

// Validation function for server actions
export function validateCompanyCreate(data: unknown) {
  return companyCreateSchema.safeParse(data)
}

export function validateCompanyUpdate(data: unknown) {
  return companyUpdateSchema.safeParse(data)
}
