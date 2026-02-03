'use client'

import { Button } from '@/components/ui/button'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'
import { getGoogleMapsDirectionsUrl, isValidCoordinates, type Coordinates } from '@/lib/maps/types'

interface OpenInMapsButtonProps {
    coordinates: Coordinates | null | undefined
    address?: string | null
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    showIcon?: boolean
    className?: string
    label?: string
}

/**
 * Button that opens Google Maps with directions to a location
 * Works on both iOS (opens Apple Maps) and Android (opens Google Maps)
 */
export function OpenInMapsButton({
    coordinates,
    address,
    variant = 'default',
    size = 'default',
    showIcon = true,
    className,
    label = 'Opna í kortum'
}: OpenInMapsButtonProps) {
    const hasValidCoords = isValidCoordinates(coordinates)

    // If no valid coordinates, show disabled state with address
    if (!hasValidCoords) {
        return (
            <Button
                variant="outline"
                size={size}
                disabled
                className={className}
            >
                {showIcon && <MapPin className="w-4 h-4 mr-2" />}
                {address ? 'Engar hnit skráðar' : 'Ekkert heimilisfang'}
            </Button>
        )
    }

    const mapsUrl = getGoogleMapsDirectionsUrl(coordinates)

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={() => window.open(mapsUrl, '_blank')}
        >
            {showIcon && <Navigation className="w-4 h-4 mr-2" />}
            {label}
            <ExternalLink className="w-3 h-3 ml-2" />
        </Button>
    )
}

/**
 * Compact version for inline use
 */
export function OpenInMapsLink({
    coordinates,
    address,
    className
}: {
    coordinates: Coordinates | null | undefined
    address?: string | null
    className?: string
}) {
    const hasValidCoords = isValidCoordinates(coordinates)

    if (!hasValidCoords) {
        return (
            <span className={`text-zinc-400 text-sm ${className || ''}`}>
                {address || 'Ekkert heimilisfang'}
            </span>
        )
    }

    const mapsUrl = getGoogleMapsDirectionsUrl(coordinates)

    return (
        <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm ${className || ''}`}
        >
            <Navigation className="w-3 h-3" />
            {address || 'Skoða á korti'}
            <ExternalLink className="w-3 h-3" />
        </a>
    )
}

/**
 * Location display with optional map link
 */
export function LocationDisplay({
    address,
    coordinates,
    showMapLink = true
}: {
    address: string | null | undefined
    coordinates: Coordinates | null | undefined
    showMapLink?: boolean
}) {
    const hasValidCoords = isValidCoordinates(coordinates)

    if (!address && !hasValidCoords) {
        return <span className="text-zinc-400 text-sm italic">Ekkert heimilisfang skráð</span>
    }

    return (
        <div className="flex flex-col gap-1">
            {address && (
                <span className="text-zinc-700">{address}</span>
            )}
            {showMapLink && hasValidCoords && (
                <OpenInMapsLink coordinates={coordinates} />
            )}
        </div>
    )
}
