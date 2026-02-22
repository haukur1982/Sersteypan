'use client'

import { useEffect } from 'react'

export function PrintAction() {
    useEffect(() => {
        // Small timeout to allow styles and fonts to load
        const timeout = setTimeout(() => {
            window.print()
        }, 500)

        return () => clearTimeout(timeout)
    }, [])

    return null
}
