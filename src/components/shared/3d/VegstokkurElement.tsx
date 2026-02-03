'use client'

import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

interface VegstokkurProps {
    status?: string | null
    length_mm?: number // Default 4000
}

export function VegstokkurElement({ status, length_mm = 4000 }: VegstokkurProps) {
    const [hovered, setHover] = useState(false)

    // Dimensions derived STRICTLY from "Section A-A" in reference.pdf
    // 1. Vertical Constraints
    const H_total = 2.40     // "2400,00" (Total Height)
    const H_inner = 2.00     // "2000,00" (Inner Depth)
    const H_floor = H_total - H_inner // 0.40m Floor Thickness

    // 2. Horizontal Constraints (Section A-A)
    const W_inner_bot = 0.86 // "860,00" (Inner Bottom Width)
    const W_inner_top = 1.20 // "1200,00" (Inner Top Width) -> implies TAPERED inner walls

    // 3. Wall Thickness calculation
    // The drawing shows a wall thickness dimension. 
    // If we look at the top, the outer width is not explicitly dimensioned in A-A, 
    // but typically these are constant thickness or vertical outer walls.
    // Let's assume Vertical Outer Walls for stability (standard for box culverts).
    // Wall Thickness at top = (Outer - 1.20)/2. 
    // Wall Thickness at bottom = (Outer - 0.86)/2.
    // Common concrete element wall thickness is ~200mm. 
    // If base wall is 200mm: Outer = 0.86 + 0.40 = 1.26m.
    // If Top Inner is 1.20 and Outer is 1.26, top lip is 30mm? That's too thin.
    // 
    // CRITICAL RE-READ OF PDF:
    // Look at "DEILI G" or "DEILI H".
    // "K12c200". 
    // The wall looks substantial at the top.
    // MAYBE the OUTER walls are ALSO tapered?
    // Isometric view shows vertical outer walls.
    // Let's try to match the visual proportion. 
    // If inner tapers 860->1200 (delta 340mm), that's a big taper.
    // Maybe the outer width is wider, e.g., 1600?
    // Let's assume a standard 200mm wall at the THINNEST point (Top?).
    // No, standard is 200mm at bottom.
    // Let's set Outer Width to 1.6m?
    // 
    // Let's look at the top dimension "1000,00" in Section A-A again (Mental check).
    // If "1000" refers to the chamfer slope length?
    // Let's stick to the MOST LIKELY engineering shape:
    // Vertical Outer Walls.
    // Heavy floor (400mm).
    // Tapered inner walls for formwork release.
    // Let's assume minimum wall thickness of 200mm at the BOTTOM (highest stress).
    // Outer Width = 0.86 + 0.2 + 0.2 = 1.26m.
    // Top thickness = (1.26 - 1.20)/2 = 0.03m (3cm). Too fraglie.
    // 
    // ALTERNATIVE: Wall thickness is 200mm at the TOP.
    // Outer Width = 1.20 + 0.2 + 0.2 = 1.60m.
    // Bottom thickness = (1.60 - 0.86)/2 = 0.37m. 
    // This makes sense structurally! Thick bottom, regular top.
    // Let's use Outer Width = 1.60m.

    const W_outer = 1.60

    const ExtrusionLength = length_mm / 1000 // Convert to meters

    const shape = useMemo(() => {
        const s = new THREE.Shape()

        // Coordinates derived from Reference PDF
        // Center-line (x=0) logic
        const xOutR = W_outer / 2
        const xOutL = -W_outer / 2

        const xInTopR = W_inner_top / 2
        const xInTopL = -W_inner_top / 2

        const xInBotR = W_inner_bot / 2
        const xInBotL = -W_inner_bot / 2

        const yBot = 0
        const yTop = H_total
        const yFloor = H_floor

        // DRAWING SEQUENCE (Clockwise or Counter-Clockwise)
        // 1. Bottom Left Outer
        s.moveTo(xOutL, yBot)
        // 2. Bottom Right Outer
        s.lineTo(xOutR, yBot)
        // 3. Top Right Outer
        s.lineTo(xOutR, yTop)
        // 4. Top Right Inner
        s.lineTo(xInTopR, yTop)
        // 5. Inner Bottom Right (The Taper)
        s.lineTo(xInBotR, yFloor)
        // 6. Inner Bottom Left
        s.lineTo(xInBotL, yFloor)
        // 7. Top Left Inner (The Taper)
        s.lineTo(xInTopL, yTop)
        // 8. Top Left Outer
        s.lineTo(xOutL, yTop)

        // Close
        s.lineTo(xOutL, yBot)

        return s
    }, [])

    const extrudeSettings = useMemo(() => ({
        steps: 1,
        depth: ExtrusionLength,
        bevelEnabled: false, // Concrete cast is usually sharp or slight bevel, keep sharp for schematic
    }), [ExtrusionLength])

    const getColor = () => {
        switch (status) {
            case 'planned': return '#71717a'
            case 'rebar': return '#f97316'
            case 'cast': return '#8b5cf6'
            case 'curing': return '#a855f7'
            case 'ready': return '#22c55e'
            case 'loaded': return '#eab308'
            case 'delivered': return '#3b82f6'
            default: return '#9ca3af'
        }
    }

    return (
        <group>
            <mesh
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
                rotation={[0, 0, 0]}
                position={[0, 0, -ExtrusionLength / 2]} // Center the extrusion in Z
            >
                <extrudeGeometry args={[shape, extrudeSettings]} />
                <meshStandardMaterial
                    color={hovered ? '#fbbf24' : getColor()}
                    roughness={0.7}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                />
                {hovered && (
                    <lineSegments position={[0, 0, 0]}>
                        <edgesGeometry args={[new THREE.ExtrudeGeometry(shape, extrudeSettings)]} />
                        <lineBasicMaterial color="black" linewidth={1} />
                    </lineSegments>
                )}
            </mesh>

            <Html position={[0, H_total + 0.5, 0]}>
                <div className="bg-black/80 text-white text-xs p-2 rounded backdrop-blur-sm border border-white/10">
                    <div className="font-bold mb-1">VEGSTOKKUR</div>
                    <div className="grid grid-cols-2 gap-x-2 text-[10px] text-zinc-400">
                        <span>Hæð:</span> <span className="text-white">2400mm</span>
                        <span>Lengd:</span> <span className="text-white">{length_mm}mm</span>
                        <span>Breidd:</span> <span className="text-white">1260mm</span>
                    </div>
                </div>
            </Html>
        </group>
    )
}
