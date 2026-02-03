/**
 * Types for maps and geocoding functionality
 */

export interface Coordinates {
    latitude: number
    longitude: number
}

export interface GeocodingResult {
    success: boolean
    coordinates?: Coordinates
    formattedAddress?: string
    error?: string
}

export interface ProjectLocation {
    projectId: string
    projectName: string
    address: string | null
    coordinates: Coordinates | null
}

/**
 * Generate a Google Maps directions URL
 * This URL works on both iOS and Android - opens native maps app
 */
export function getGoogleMapsDirectionsUrl(destination: Coordinates): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`
}

/**
 * Generate a Google Maps URL to view a location
 */
export function getGoogleMapsViewUrl(location: Coordinates, label?: string): string {
    const baseUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
    return label ? `${baseUrl}&query_place_id=${encodeURIComponent(label)}` : baseUrl
}

/**
 * Check if coordinates are valid (within reasonable bounds)
 */
export function isValidCoordinates(coords: Coordinates | null | undefined): coords is Coordinates {
    if (!coords) return false
    const { latitude, longitude } = coords
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    )
}

/**
 * Iceland-specific coordinate validation
 * Iceland roughly spans: lat 63-67, lng -25 to -13
 */
export function isInIceland(coords: Coordinates): boolean {
    const { latitude, longitude } = coords
    return latitude >= 63 && latitude <= 67 && longitude >= -25 && longitude <= -13
}
