'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Scene } from '@/components/lab/Scene'
import { ParametricWall } from '@/components/lab/ParametricWall'
import { ArrowLeft, Box, CheckCircle2, Truck } from 'lucide-react'
import Link from 'next/link'

export default function Lab3DPage() {
    // State for the wall parameters
    const [width, setWidth] = useState(3.0)
    const [height, setHeight] = useState(2.4)
    const [thickness, setThickness] = useState(0.2)
    const [status, setStatus] = useState<'planned' | 'cast' | 'delivered'>('planned')
    const [showLabels, setShowLabels] = useState(true)

    return (
        <div className="h-screen w-full flex flex-col bg-zinc-50">
            {/* Header */}
            <header className="h-16 border-b bg-white px-6 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon" className="hover:bg-zinc-100">
                            <ArrowLeft className="w-5 h-5 text-zinc-500" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Box className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="font-bold text-zinc-900">3D Visualization Lab</h1>
                            <div className="text-xs text-zinc-500">Parametric Generation Experiment // v0.1</div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded text-zinc-500">
                        SANDBOX MODE: NO DB WRITES
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left Control Panel */}
                <div className="w-96 border-r bg-white p-6 overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
                    <div className="space-y-8">

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Geometry</h2>
                                <div className="text-[10px] text-zinc-400 font-mono">UNIT: METERS</div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <Label>Width (Length)</Label>
                                        <span className="font-mono text-zinc-500">{width.toFixed(2)}m</span>
                                    </div>
                                    <Slider
                                        value={[width]}
                                        min={0.5}
                                        max={6.0}
                                        step={0.1}
                                        onValueChange={([v]) => setWidth(v)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <Label>Height</Label>
                                        <span className="font-mono text-zinc-500">{height.toFixed(2)}m</span>
                                    </div>
                                    <Slider
                                        value={[height]}
                                        min={0.5}
                                        max={4.0}
                                        step={0.1}
                                        onValueChange={([v]) => setHeight(v)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <Label>Thickness</Label>
                                        <span className="font-mono text-zinc-500">{thickness.toFixed(2)}m</span>
                                    </div>
                                    <Slider
                                        value={[thickness]}
                                        min={0.1}
                                        max={0.5}
                                        step={0.05}
                                        onValueChange={([v]) => setThickness(v)}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-zinc-100" />

                        <section className="space-y-4">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Production Status</h2>
                            <div className="grid grid-cols-1 gap-2">
                                <Button
                                    variant={status === 'planned' ? 'secondary' : 'outline'}
                                    className={`justify-start ${status === 'planned' ? 'bg-zinc-100 ring-1 ring-zinc-300' : ''}`}
                                    onClick={() => setStatus('planned')}
                                >
                                    <Box className="w-4 h-4 mr-2 text-zinc-500" />
                                    Planned (Gray)
                                </Button>
                                <Button
                                    variant={status === 'cast' ? 'secondary' : 'outline'}
                                    className={`justify-start ${status === 'cast' ? 'bg-green-50 ring-1 ring-green-200 text-green-700' : ''}`}
                                    onClick={() => setStatus('cast')}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                    Cast (Green)
                                </Button>
                                <Button
                                    variant={status === 'delivered' ? 'secondary' : 'outline'}
                                    className={`justify-start ${status === 'delivered' ? 'bg-blue-50 ring-1 ring-blue-200 text-blue-700' : ''}`}
                                    onClick={() => setStatus('delivered')}
                                >
                                    <Truck className="w-4 h-4 mr-2 text-blue-600" />
                                    Delivered (Blue)
                                </Button>
                            </div>
                        </section>

                        <div className="h-px bg-zinc-100" />

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="labels-mode">Show AR Labels</Label>
                                <Switch id="labels-mode" checked={showLabels} onCheckedChange={setShowLabels} />
                            </div>
                        </section>

                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <div className="text-yellow-600 text-lg">💡</div>
                                <div className="text-xs text-yellow-800 leading-relaxed">
                                    <strong>AI Vision Concept:</strong><br />
                                    In the future, we upload a PDF. <br />
                                    The AI reads &quot;W=3200, H=2400&quot;. <br />
                                    It automatically sets these sliders for you. <br />
                                    0% data entry. 100% accuracy.
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right 3D Viewport */}
                <div className="flex-1 bg-zinc-100 p-8 shadow-inner">
                    <Scene>
                        <ParametricWall
                            width={width}
                            height={height}
                            thickness={thickness}
                            status={status}
                            showLabels={showLabels}
                        />
                    </Scene>
                </div>

            </main>
        </div>
    )
}
