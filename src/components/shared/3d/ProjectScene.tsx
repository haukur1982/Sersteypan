'use client'

import { useMemo } from 'react'
import { Scene } from './Scene'
import { ParametricElement } from './ParametricElement'
import { VegstokkurElement } from './VegstokkurElement'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export interface ElementPosition {
    id: string
    x_percent: number
    y_percent: number
    rotation_degrees: number | null
    label: string | null
    element: {
        id: string
        name: string
        element_type: string
        status: string | null
        width_mm: number | null
        height_mm: number | null
        length_mm: number | null
    } | null
}

export interface FloorPlan {
    id: string
    name: string | null
    floor: number
    width_px: number | null
    height_px: number | null
    element_positions: ElementPosition[]
}

interface ProjectSceneProps {
    floorPlans: FloorPlan[]
}

export function ProjectScene({ floorPlans }: ProjectSceneProps) {
    // Constants for the 2.5D projection
    const FLOOR_HEIGHT = 3.5 // Meters between floors
    const BUILDING_WIDTH = 40 // Virtual meters for width (Assuming 100% width = 40m)

    // Sort floors by index
    const sortedFloors = useMemo(() => {
        return [...floorPlans].sort((a, b) => a.floor - b.floor)
    }, [floorPlans])

    return (
        <Scene className="h-[600px] w-full bg-zinc-900 border-zinc-800" cameraPosition={[30, 25, 30]}>
            {/* Darker environment for "Hologram" feel */}
            <color attach="background" args={['#18181b']} />
            <fog attach="fog" args={['#18181b', 10, 50]} />

            {sortedFloors.map((plan) => {
                const yLevel = (plan.floor - 1) * FLOOR_HEIGHT

                // Calculate scale factor based on image aspect ratio
                // Default to square 1:1 if no dimensions
                const aspectRatio = (plan.width_px && plan.height_px)
                    ? plan.height_px / plan.width_px
                    : 1

                const buildingDepth = BUILDING_WIDTH * aspectRatio

                return (
                    <group key={plan.id} position={[0, yLevel, 0]}>
                        {/* Floor Label */}
                        <Html position={[-BUILDING_WIDTH / 2 - 2, 0, 0]}>
                            <div className="text-zinc-500 font-mono text-xs whitespace-nowrap">
                                FLOOR {plan.floor} {plan.name && `- ${plan.name}`}
                            </div>
                        </Html>

                        {/* Floor Plate (Ghost) */}
                        <mesh
                            rotation={[-Math.PI / 2, 0, 0]}
                            position={[0, -0.05, 0]}
                            receiveShadow
                        >
                            <planeGeometry args={[BUILDING_WIDTH + 2, buildingDepth + 2]} />
                            <meshStandardMaterial
                                color="#27272a"
                                transparent
                                opacity={0.3}
                                side={THREE.DoubleSide}
                            />
                            <lineSegments>
                                <edgesGeometry args={[new THREE.PlaneGeometry(BUILDING_WIDTH + 2, buildingDepth + 2)]} />
                                <lineBasicMaterial color="#3f3f46" opacity={0.2} transparent />
                            </lineSegments>
                        </mesh>

                        {/* Elements on this floor */}
                        {plan.element_positions.map((pos) => {
                            if (!pos.element) return null

                            // Map percent (0-100) to 3D coords (-Width/2 to Width/2)
                            // X: 0% = Left (-), 100% = Right (+)
                            // Y (Image) -> Z (3D): 0% = Top (-), 100% = Bottom (+)
                            const x3d = ((pos.x_percent / 100) - 0.5) * BUILDING_WIDTH
                            const z3d = ((pos.y_percent / 100) - 0.5) * buildingDepth

                            return (
                                <group
                                    key={pos.id}
                                    position={[x3d, 0, z3d]}
                                    rotation={[0, -THREE.MathUtils.degToRad(pos.rotation_degrees || 0), 0]}
                                >
                                    {/* Render specific component based on type */}
                                    {(pos.element.element_type === 'vegstokkur' || pos.element.name.toLowerCase().includes('stokkur')) ? (
                                        <VegstokkurElement
                                            length_mm={pos.element.length_mm || 4000}
                                            status={pos.element.status}
                                        />
                                    ) : (
                                        <ParametricElement
                                            length_mm={pos.element.length_mm}
                                            height_mm={pos.element.height_mm}
                                            width_mm={pos.element.width_mm}
                                            status={pos.element.status}
                                            showLabels={false} // Too clear for bird's eye view
                                        />
                                    )}
                                </group>
                            )
                        })}
                    </group>
                )
            })}

            {/* PREVIEW MODE: SHOW THE NEW MODEL IMMEDIATELY */}
            <group position={[0, 2, 5]} rotation={[0, Math.PI / 6, 0]}>
                <VegstokkurElement length_mm={4000} status="cast" />
                <Html position={[0, 3, 0]}>
                    <div className="bg-blue-600 text-white font-bold px-3 py-1 rounded shadow-lg animate-pulse">
                        NEW DESIGN
                    </div>
                </Html>
            </group>

        </Scene>
    )
}
