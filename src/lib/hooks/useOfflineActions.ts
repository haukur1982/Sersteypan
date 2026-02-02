'use client'

import { useCallback, useState } from 'react'
import {
  queueAction,
  type AddElementPayload,
  type RemoveElementPayload,
  type ConfirmDeliveryPayload,
  type StartDeliveryPayload,
  type ArriveAtSitePayload,
  type CompleteDeliveryPayload,
} from '@/lib/offline/queue'
import {
  addElementToDelivery as serverAddElement,
  removeElementFromDelivery as serverRemoveElement,
  confirmElementDelivered as serverConfirmDelivered,
} from '@/lib/driver/qr-actions'
import {
  startDelivery as serverStartDelivery,
  arriveAtSite as serverArriveAtSite,
  completeDelivery as serverCompleteDelivery,
} from '@/lib/driver/delivery-actions'
import { toast } from 'sonner'

/**
 * Hook that provides offline-aware versions of driver actions.
 * When online, calls the server action directly.
 * When offline, queues the action for later sync.
 */
export function useOfflineActions() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Track online/offline status
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))
  }

  /**
   * Add element to delivery (offline-aware)
   */
  const addElementToDelivery = useCallback(
    async (
      deliveryId: string,
      elementId: string,
      elementName: string,
      loadPosition?: string
    ): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
      if (isOnline) {
        // Online: call server action directly
        const result = await serverAddElement(deliveryId, elementId, loadPosition)
        return result
      } else {
        // Offline: queue action
        try {
          const payload: AddElementPayload = {
            deliveryId,
            elementId,
            elementName,
            loadPosition,
            timestamp: new Date().toISOString(),
          }
          await queueAction('add_element_to_delivery', payload)
          toast.info(`Eining í biðröð: ${elementName}`, {
            description: 'Verður samstillt þegar nettenging kemst á.',
          })
          return { success: true, queued: true }
        } catch (error) {
          console.error('Failed to queue action:', error)
          return { success: false, error: 'Failed to queue action' }
        }
      }
    },
    [isOnline]
  )

  /**
   * Remove element from delivery (offline-aware)
   */
  const removeElementFromDelivery = useCallback(
    async (
      deliveryId: string,
      elementId: string
    ): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
      if (isOnline) {
        const result = await serverRemoveElement(deliveryId, elementId)
        return result
      } else {
        try {
          const payload: RemoveElementPayload = {
            deliveryId,
            elementId,
            timestamp: new Date().toISOString(),
          }
          await queueAction('remove_element_from_delivery', payload)
          toast.info('Aðgerð í biðröð', {
            description: 'Verður samstillt þegar nettenging kemst á.',
          })
          return { success: true, queued: true }
        } catch (error) {
          console.error('Failed to queue action:', error)
          return { success: false, error: 'Failed to queue action' }
        }
      }
    },
    [isOnline]
  )

  /**
   * Confirm element delivered (offline-aware)
   */
  const confirmElementDelivered = useCallback(
    async (
      deliveryId: string,
      elementId: string,
      photoUrl?: string,
      notes?: string
    ): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
      if (isOnline) {
        const result = await serverConfirmDelivered(deliveryId, elementId, photoUrl, notes)
        return result
      } else {
        try {
          const payload: ConfirmDeliveryPayload = {
            deliveryId,
            elementId,
            photoUrl,
            notes,
            timestamp: new Date().toISOString(),
          }
          await queueAction('confirm_element_delivered', payload)
          toast.info('Afhending í biðröð', {
            description: 'Verður samstillt þegar nettenging kemst á.',
          })
          return { success: true, queued: true }
        } catch (error) {
          console.error('Failed to queue action:', error)
          return { success: false, error: 'Failed to queue action' }
        }
      }
    },
    [isOnline]
  )

  /**
   * Start delivery (offline-aware)
   */
  const startDelivery = useCallback(
    async (deliveryId: string): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
      if (isOnline) {
        const result = await serverStartDelivery(deliveryId)
        return result
      } else {
        try {
          const payload: StartDeliveryPayload = {
            deliveryId,
            timestamp: new Date().toISOString(),
          }
          await queueAction('start_delivery', payload)
          toast.info('Brottför í biðröð', {
            description: 'Verður samstillt þegar nettenging kemst á.',
          })
          return { success: true, queued: true }
        } catch (error) {
          console.error('Failed to queue action:', error)
          return { success: false, error: 'Failed to queue action' }
        }
      }
    },
    [isOnline]
  )

  /**
   * Arrive at site (offline-aware)
   */
  const arriveAtSite = useCallback(
    async (
      deliveryId: string,
      gpsLat?: number,
      gpsLng?: number
    ): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
      if (isOnline) {
        const result = await serverArriveAtSite(deliveryId, gpsLat, gpsLng)
        return result
      } else {
        try {
          const payload: ArriveAtSitePayload = {
            deliveryId,
            gpsLat,
            gpsLng,
            timestamp: new Date().toISOString(),
          }
          await queueAction('arrive_at_site', payload)
          toast.info('Koma í biðröð', {
            description: 'Verður samstillt þegar nettenging kemst á.',
          })
          return { success: true, queued: true }
        } catch (error) {
          console.error('Failed to queue action:', error)
          return { success: false, error: 'Failed to queue action' }
        }
      }
    },
    [isOnline]
  )

  /**
   * Complete delivery (offline-aware)
   */
  const completeDelivery = useCallback(
    async (
      deliveryId: string,
      receivedByName: string,
      signatureUrl?: string,
      photoUrl?: string,
      notes?: string
    ): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
      if (isOnline) {
        const result = await serverCompleteDelivery(
          deliveryId,
          receivedByName,
          signatureUrl,
          photoUrl,
          notes
        )
        return result
      } else {
        try {
          const payload: CompleteDeliveryPayload = {
            deliveryId,
            receivedByName,
            signatureUrl,
            photoUrl,
            notes,
            timestamp: new Date().toISOString(),
          }
          await queueAction('complete_delivery', payload)
          toast.info('Afhending í biðröð', {
            description: 'Verður samstillt þegar nettenging kemst á.',
          })
          return { success: true, queued: true }
        } catch (error) {
          console.error('Failed to queue action:', error)
          return { success: false, error: 'Failed to queue action' }
        }
      }
    },
    [isOnline]
  )

  return {
    isOnline,
    addElementToDelivery,
    removeElementFromDelivery,
    confirmElementDelivered,
    startDelivery,
    arriveAtSite,
    completeDelivery,
  }
}
