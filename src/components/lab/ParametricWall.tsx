'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, BoxGeometry } from 'three'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface ParametricWallProps {
    width: number
    height: number
    thickness: number
    status: 'planned' | 'cast' | 'delivered'
    showLabels?: boolean
}

export function ParametricWall({ width, height, thickness, status, showLabels = true }: ParametricWallProps) {
    const meshRef = useRef<Mesh>(null)

    // Smooth animation for color changes
    const getColor = () => {
        switch (status) {
            case 'cast': return '#22c55e' // Green-500
            case 'delivered': return '#3b82f6' // Blue-500
            default: return '#9ca3af' // Gray-400 (Concrete)
        }
    }

    // Simple hover effect
    const [hovered, setHover] = useState(false)

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
                <Html position={[width / 2 + 0.5, height / 2, 0]}>
                    <div className="bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap backdrop-blur-sm">
                        <div>H: {height.toFixed(2)}m</div>
                        <div>W: {width.toFixed(2)}m</div>
                        <div className="text-zinc-400 text-[10px] mt-1 uppercase tracking-wider">{status}</div>
                    </div>
                </Html>
            )}
        </group>
    )
}

