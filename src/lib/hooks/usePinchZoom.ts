'use client'

import { useRef, useState, useCallback } from 'react'

interface PinchZoomState {
    scale: number
    translateX: number
    translateY: number
}

interface PinchZoomHandlers {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onWheel: (e: React.WheelEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_ZOOM = 2.5
const DOUBLE_TAP_DELAY = 300

function getDistance(t1: React.Touch, t2: React.Touch) {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
}

function getCenter(t1: React.Touch, t2: React.Touch) {
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }
}

function clamp(val: number, min: number, max: number) {
    return Math.min(Math.max(val, min), max)
}

export function usePinchZoom() {
    const [state, setState] = useState<PinchZoomState>({ scale: 1, translateX: 0, translateY: 0 })

    const lastPinchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null)
    const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
    const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
    const isDragging = useRef(false)

    const resetZoom = useCallback(() => {
        setState({ scale: 1, translateX: 0, translateY: 0 })
    }, [])

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            lastPinchRef.current = {
                distance: getDistance(e.touches[0], e.touches[1]),
                center: getCenter(e.touches[0], e.touches[1]),
            }
        } else if (e.touches.length === 1) {
            const now = Date.now()
            const tap = lastTapRef.current
            const touch = e.touches[0]

            // Detect double-tap
            if (tap && now - tap.time < DOUBLE_TAP_DELAY && Math.abs(touch.clientX - tap.x) < 30 && Math.abs(touch.clientY - tap.y) < 30) {
                lastTapRef.current = null
                setState(prev => {
                    if (prev.scale > 1.1) {
                        return { scale: 1, translateX: 0, translateY: 0 }
                    }
                    return { scale: DOUBLE_TAP_ZOOM, translateX: 0, translateY: 0 }
                })
                return
            }

            lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY }

            // Start pan if zoomed
            setState(prev => {
                if (prev.scale > 1.05) {
                    panStartRef.current = { x: touch.clientX, y: touch.clientY, tx: prev.translateX, ty: prev.translateY }
                }
                return prev
            })
        }
    }, [])

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault()

        if (e.touches.length === 2) {
            const distance = getDistance(e.touches[0], e.touches[1])
            const prev = lastPinchRef.current
            if (prev) {
                const ratio = distance / prev.distance
                setState(s => ({
                    ...s,
                    scale: clamp(s.scale * ratio, MIN_SCALE, MAX_SCALE),
                }))
            }
            lastPinchRef.current = {
                distance,
                center: getCenter(e.touches[0], e.touches[1]),
            }
            // Cancel any pending tap
            lastTapRef.current = null
        } else if (e.touches.length === 1 && panStartRef.current) {
            const touch = e.touches[0]
            const dx = touch.clientX - panStartRef.current.x
            const dy = touch.clientY - panStartRef.current.y
            setState(s => ({
                ...s,
                translateX: panStartRef.current!.tx + dx,
                translateY: panStartRef.current!.ty + dy,
            }))
            // If user moved significantly, cancel tap detection
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                lastTapRef.current = null
            }
        }
    }, [])

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 0) {
            lastPinchRef.current = null
            panStartRef.current = null
            // Snap back to 1 if near it
            setState(prev => {
                if (prev.scale < 1.05) {
                    return { scale: 1, translateX: 0, translateY: 0 }
                }
                return prev
            })
        }
    }, [])

    // Mouse wheel zoom (desktop)
    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setState(prev => {
            const newScale = clamp(prev.scale * delta, MIN_SCALE, MAX_SCALE)
            if (newScale <= 1.05) {
                return { scale: 1, translateX: 0, translateY: 0 }
            }
            return { ...prev, scale: newScale }
        })
    }, [])

    // Mouse drag pan (desktop)
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        setState(prev => {
            if (prev.scale > 1.05) {
                isDragging.current = true
                panStartRef.current = { x: e.clientX, y: e.clientY, tx: prev.translateX, ty: prev.translateY }
            }
            return prev
        })
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging.current && panStartRef.current) {
            const dx = e.clientX - panStartRef.current.x
            const dy = e.clientY - panStartRef.current.y
            setState(s => ({
                ...s,
                translateX: panStartRef.current!.tx + dx,
                translateY: panStartRef.current!.ty + dy,
            }))
        }
    }, [])

    const onMouseUp = useCallback(() => {
        isDragging.current = false
        panStartRef.current = null
    }, [])

    const handlers: PinchZoomHandlers = {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onWheel,
        onMouseDown,
        onMouseMove,
        onMouseUp,
    }

    return {
        scale: state.scale,
        translateX: state.translateX,
        translateY: state.translateY,
        handlers,
        resetZoom,
        isZoomed: state.scale > 1.05,
    }
}
