'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei'

interface SceneProps {
    children: React.ReactNode
}

export function Scene({ children }: SceneProps) {
    return (
        <div className="h-full w-full rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 shadow-inner relative">
            <Canvas camera={{ position: [4, 4, 4], fov: 50 }}>
                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Environment - Warehouse-ish look */}
                <Environment preset="city" />

                {/* The Content */}
                <group position={[0, 0, 0]}>
                    {children}
                </group>

                {/* Floor / Context */}
                <Grid
                    position={[0, -0.01, 0]}
                    args={[10, 10]}
                    cellSize={1}
                    cellThickness={1}
                    cellColor="#e4e4e7"
                    sectionSize={5}
                    sectionThickness={1.5}
                    sectionColor="#d4d4d8"
                    fadeDistance={20}
                />
                <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />

                {/* Controls */}
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
            </Canvas>

            <div className="absolute bottom-4 right-4 text-[10px] text-zinc-400 font-mono pointer-events-none select-none">
                RENDERER: WEBGL 2.0 // THREE.JS r160
            </div>
        </div>
    )
}
