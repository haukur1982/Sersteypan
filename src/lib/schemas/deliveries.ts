import { z } from 'zod'
import {
  safeStringSchema,
  optionalStringSchema,
  uuidSchema,
  optionalDateStringSchema
} from './common'

/**
 * Delivery validation schemas
 */

export const deliveryStatusSchema = z.enum(
  ['planned', 'loading', 'in_transit', 'arrived', 'completed', 'cancelled'],
  { message: 'Ógild staða afhendingar' }
)

// Valid delivery status transitions (state machine)
export const validDeliveryStatusTransitions: Record<string, string[]> = {
  planned: ['loading', 'cancelled'],
  loading: ['in_transit', 'planned', 'cancelled'],
  in_transit: ['arrived', 'loading'],
  arrived: ['completed', 'in_transit'],
  completed: [], // Final state
  cancelled: ['planned'] // Can reactivate
}

// Truck registration (Icelandic format: 2-3 letters + 1-3 digits, or similar)
export const truckRegistrationSchema = safeStringSchema(1, 20)
  .transform((val) => val.toUpperCase())
  .describe('Bílnúmer')

// Schema for creating a delivery
export const deliveryCreateSchema = z.object({
  projectId: uuidSchema.describe('Verkefni'),
  truckRegistration: truckRegistrationSchema,
  truckDescription: optionalStringSchema(200).describe('Lýsing á bíl'),
  plannedDate: optionalDateStringSchema.describe('Áætluð dagsetning')
})

// Schema for completing a delivery
export const deliveryCompleteSchema = z.object({
  deliveryId: uuidSchema.describe('Afhending'),
  receivedByName: safeStringSchema(1, 100).describe('Nafn móttakanda'),
  signatureUrl: optionalStringSchema(500).describe('Undirskrift'),
  photoUrl: optionalStringSchema(500).describe('Mynd'),
  notes: optionalStringSchema(2000).describe('Athugasemdir')
})

// Schema for quick complete (simplified)
export const deliveryQuickCompleteSchema = z.object({
  deliveryId: uuidSchema.describe('Afhending'),
  receivedByName: safeStringSchema(1, 100).describe('Nafn móttakanda'),
  signatureUrl: optionalStringSchema(500).describe('Undirskrift'),
  photoUrl: optionalStringSchema(500).describe('Mynd')
})

// Schema for status update
export const deliveryStatusUpdateSchema = z.object({
  deliveryId: uuidSchema.describe('Afhending'),
  newStatus: deliveryStatusSchema.describe('Ný staða')
})

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>
export type DeliveryCreateInput = z.infer<typeof deliveryCreateSchema>
export type DeliveryCompleteInput = z.infer<typeof deliveryCompleteSchema>
export type DeliveryQuickCompleteInput = z.infer<typeof deliveryQuickCompleteSchema>
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>

export function validateDeliveryCreate(data: unknown) {
  return deliveryCreateSchema.safeParse(data)
}

export function validateDeliveryComplete(data: unknown) {
  return deliveryCompleteSchema.safeParse(data)
}

export function validateDeliveryQuickComplete(data: unknown) {
  return deliveryQuickCompleteSchema.safeParse(data)
}

export function validateDeliveryStatusUpdate(data: unknown) {
  return deliveryStatusUpdateSchema.safeParse(data)
}

// Validate delivery status transition
export function isValidDeliveryStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = validDeliveryStatusTransitions[currentStatus]
  return allowed?.includes(newStatus) ?? false
}
