'use client'

import { useRef, useState } from 'react'
import { Mesh } from 'three'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface ParametricElementProps {
    length_mm: number | null
    height_mm: number | null
    width_mm: number | null // Thickness
    status: string | null
    showLabels?: boolean
}

export function ParametricElement({
    length_mm,
    height_mm,
    width_mm,
    status,
    showLabels = true
}: ParametricElementProps) {
    const meshRef = useRef<Mesh>(null)
    const [hovered, setHover] = useState(false)

    // Convert mm to meters (defaults if null)
    const width = (length_mm || 1000) / 1000
    const height = (height_mm || 1000) / 1000
    const thickness = (width_mm || 200) / 1000

    // Smooth animation for color changes
    const getColor = () => {
        switch (status) {
            case 'planned': return '#71717a' // Zinc-500
            case 'rebar': return '#f97316' // Orange-500
            case 'cast': return '#8b5cf6' // Violet-500
            case 'curing': return '#a855f7' // Purple-500
            case 'ready': return '#22c55e' // Green-500
            case 'loaded': return '#eab308' // Yellow-500
            case 'delivered': return '#3b82f6' // Blue-500
            default: return '#9ca3af' // Gray-400 (Fallback)
        }
    }

    return (
        <group>
            <mesh
                ref={meshRef}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
                position={[0, height / 2, 0]} // Pivot from bottom center
            >
                <boxGeometry args={[width, height, thickness]} />
                <meshStandardMaterial
                    color={hovered ? '#fbbf24' : getColor()} // Gold on hover, else status color
                    roughness={0.8}
                    metalness={0.2}
                />

                {/* Wireframe overlay for technical look */}
                {hovered && (
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(width, height, thickness)]} />
                        <lineBasicMaterial color="black" />
                    </lineSegments>
                )}
            </mesh>

            {/* Dimensions Label */}
            {showLabels && (
                <Html position={[width / 2 + 0.2, height / 2, 0]}>
                    <div className="bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap backdrop-blur-sm shadow-xl border border-white/10">
                        <div className="font-mono border-b border-white/20 mb-1 pb-1">SÉRSTEYPAN ID</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            <span className="text-zinc-400">Lengd (L):</span>
                            <span className="font-bold text-right">{length_mm}mm</span>

                            <span className="text-zinc-400">Hæð (H):</span>
                            <span className="font-bold text-right">{height_mm}mm</span>

                            <span className="text-zinc-400">Breidd (B):</span>
                            <span className="font-bold text-right">{width_mm}mm</span>
                        </div>
                        <div className="text-zinc-400 text-[10px] mt-2 uppercase tracking-wider text-center bg-white/10 rounded py-0.5">
                            {status || 'PLANNED'}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    )
}
