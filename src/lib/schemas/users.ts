import { z } from 'zod'
import { emailSchema, safeStringSchema, phoneSchema, uuidSchema } from './common'

// Role enum
export const userRoleSchema = z.enum(['admin', 'factory_manager', 'buyer', 'driver'])

// Create user schema
export const userCreateSchema = z.object({
  email: emailSchema,
  password: safeStringSchema(6, 100).describe('Lykilorð'),
  full_name: safeStringSchema(2, 200).describe('Fullt nafn'),
  phone: phoneSchema,
  role: userRoleSchema,
  company_id: uuidSchema.optional() // Required when role === 'buyer'
}).refine(
  (data) => data.role !== 'buyer' || !!data.company_id,
  { message: 'Fyrirtæki er nauðsynlegt fyrir kaupendur', path: ['company_id'] }
)

// Update user schema (similar but no password)
export const userUpdateSchema = z.object({
  id: uuidSchema,
  full_name: safeStringSchema(2, 200).describe('Fullt nafn'),
  phone: phoneSchema,
  role: userRoleSchema,
  company_id: uuidSchema.optional()
}).refine(
  (data) => data.role !== 'buyer' || !!data.company_id,
  { message: 'Fyrirtæki er nauðsynlegt fyrir kaupendur', path: ['company_id'] }
)

export type UserRole = z.infer<typeof userRoleSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>

export function validateUserCreate(data: unknown) {
  return userCreateSchema.safeParse(data)
}

export function validateUserUpdate(data: unknown) {
  return userUpdateSchema.safeParse(data)
}
