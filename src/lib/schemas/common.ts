import { z } from 'zod'

/**
 * Common validation schemas and utilities
 */

// UUID validation
export const uuidSchema = z.string().uuid('Ógilt auðkenni')

// Icelandic kennitala validation (SSN)
// Format: DDMMYY-XXXX or DDMMYYXXXX
export const kennitalaSchema = z
  .string()
  .transform((val) => val.replace('-', ''))
  .refine(
    (val) => /^\d{10}$/.test(val),
    { message: 'Kennitala verður að vera 10 tölustafir' }
  )
  .refine(
    (val) => {
      // Validate checksum (Icelandic kennitala validation)
      const weights = [3, 2, 7, 6, 5, 4, 3, 2]
      const digits = val.slice(0, 8).split('').map(Number)
      const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0)
      const remainder = sum % 11
      const checkDigit = remainder === 0 ? 0 : 11 - remainder
      return checkDigit === parseInt(val[8], 10) || checkDigit === 10
    },
    { message: 'Ógild kennitala' }
  )

// Icelandic phone number
export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/[\s-]/g, ''))
  .refine(
    (val) => /^(\+354)?\d{7}$/.test(val),
    { message: 'Símanúmer verður að vera 7 tölustafir' }
  )
  .optional()
  .or(z.literal(''))

// Email
export const emailSchema = z
  .string()
  .email('Ógilt netfang')
  .max(255, 'Netfang má ekki vera lengra en 255 stafir')

// URL
export const urlSchema = z
  .string()
  .url('Ógild vefslóð')
  .max(2048, 'Vefslóð má ekki vera lengri en 2048 stafir')
  .optional()
  .or(z.literal(''))

// Safe string (trimmed, non-empty)
export const safeStringSchema = (min = 1, max = 500) =>
  z
    .string()
    .trim()
    .min(min, `Verður að vera að minnsta kosti ${min} stafur`)
    .max(max, `Má ekki vera lengra en ${max} stafir`)

// Optional safe string
export const optionalStringSchema = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Má ekki vera lengra en ${max} stafir`)
    .optional()
    .or(z.literal(''))
    .transform((val) => val || undefined)

// Positive number
export const positiveNumberSchema = z
  .number()
  .positive('Verður að vera jákvæð tala')

// Non-negative number
export const nonNegativeNumberSchema = z
  .number()
  .min(0, 'Verður að vera 0 eða hærra')

// Date string (ISO format)
export const dateStringSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Ógild dagsetning' }
  )

// Optional date string
export const optionalDateStringSchema = dateStringSchema
  .optional()
  .or(z.literal(''))
  .transform((val) => val || undefined)

// Dimension in mm (for concrete elements)
export const dimensionSchema = z
  .number()
  .int('Verður að vera heil tala')
  .min(1, 'Verður að vera að minnsta kosti 1 mm')
  .max(50000, 'Má ekki vera meira en 50.000 mm (50m)')
  .optional()

// Weight in kg
export const weightSchema = z
  .number()
  .min(0.1, 'Verður að vera að minnsta kosti 0,1 kg')
  .max(100000, 'Má ekki vera meira en 100.000 kg')
  .optional()

// Floor number (stored as string in some places, number in DB)
export const floorSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    if (typeof val === 'number') return val
    const num = parseInt(val, 10)
    return isNaN(num) ? undefined : num
  })
  .optional()

// Floor as string (for display purposes)
export const floorStringSchema = z
  .string()
  .max(20, 'Hæðarnúmer má ekki vera lengra en 20 stafir')
  .optional()
  .or(z.literal(''))

// Priority (1-999)
export const prioritySchema = z
  .number()
  .int('Verður að vera heil tala')
  .min(0, 'Verður að vera 0 eða hærra')
  .max(999, 'Má ekki vera hærra en 999')
  .default(0)

// Parse helpers for form data
export const parseNumber = (val: unknown): number | undefined => {
  if (val === '' || val === null || val === undefined) return undefined
  const num = Number(val)
  return isNaN(num) ? undefined : num
}

export const parseOptionalNumber = (val: unknown): number | undefined => {
  if (val === '' || val === null || val === undefined) return undefined
  const num = Number(val)
  return isNaN(num) ? undefined : num
}

// Validation result type
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errors?: Record<string, string> }

// Helper to format Zod errors into a readable format
export function formatZodError(error: z.ZodError): { error: string; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    errors[path] = issue.message
  })

  const firstError = error.issues[0]?.message || 'Staðfestingarvilla'

  return {
    error: firstError,
    errors
  }
}
