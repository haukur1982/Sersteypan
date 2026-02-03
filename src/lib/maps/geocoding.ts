'use server'

import type { Coordinates, GeocodingResult } from './types'

/**
 * Geocode an address using Google Maps Geocoding API
 *
 * Requires GOOGLE_MAPS_API_KEY environment variable
 *
 * @param address - The address to geocode (e.g., "Höfði 1, Reykjavík")
 * @returns GeocodingResult with coordinates or error
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
        return {
            success: false,
            error: 'Google Maps API key not configured'
        }
    }

    if (!address || address.trim().length < 3) {
        return {
            success: false,
            error: 'Address too short'
        }
    }

    try {
        // Add Iceland as region bias for better results
        const encodedAddress = encodeURIComponent(address.trim())
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=is&key=${apiKey}`

        const response = await fetch(url)
        const data = await response.json()

        if (data.status === 'OK' && data.results?.length > 0) {
            const result = data.results[0]
            const location = result.geometry.location

            return {
                success: true,
                coordinates: {
                    latitude: location.lat,
                    longitude: location.lng
                },
                formattedAddress: result.formatted_address
            }
        }

        if (data.status === 'ZERO_RESULTS') {
            return {
                success: false,
                error: 'Heimilisfang fannst ekki (Address not found)'
            }
        }

        if (data.status === 'REQUEST_DENIED') {
            console.error('Google Maps API request denied:', data.error_message)
            return {
                success: false,
                error: 'API villa - vinsamlegast reyndu aftur'
            }
        }

        return {
            success: false,
            error: `Geocoding failed: ${data.status}`
        }

    } catch (error) {
        console.error('Geocoding error:', error)
        return {
            success: false,
            error: 'Villa við að leita að heimilisfangi'
        }
    }
}

/**
 * Update project coordinates in database
 */
export async function updateProjectCoordinates(
    projectId: string,
    coordinates: Coordinates
): Promise<{ success: boolean; error?: string }> {
    // Dynamic import to avoid circular dependencies
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Role check - only admins can update project coordinates
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
    }

    // Note: latitude/longitude columns need migration 017_add_project_coordinates.sql
    // Using type cast until database types are regenerated
    const { error } = await supabase
        .from('projects')
        .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
        } as Record<string, unknown>)
        .eq('id', projectId)

    if (error) {
        console.error('Error updating project coordinates:', error)
        return { success: false, error: 'Database update failed' }
    }

    return { success: true }
}

/**
 * Geocode address and save to project in one step
 */
export async function geocodeAndSaveProject(
    projectId: string,
    address: string
): Promise<GeocodingResult> {
    // First geocode the address
    const geocodeResult = await geocodeAddress(address)

    if (!geocodeResult.success || !geocodeResult.coordinates) {
        return geocodeResult
    }

    // Then save to database
    const saveResult = await updateProjectCoordinates(projectId, geocodeResult.coordinates)

    if (!saveResult.success) {
        return {
            success: false,
            error: saveResult.error
        }
    }

    return geocodeResult
}
