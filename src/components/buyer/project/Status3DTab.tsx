'use client'

import { ProjectScene, type FloorPlan } from '@/components/shared/3d/ProjectScene'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Box, Layers } from 'lucide-react'

interface Status3DTabProps {
    floorPlans: FloorPlan[]
}

export function Status3DTab({ floorPlans }: Status3DTabProps) {
    if (floorPlans?.length > 0) {
        console.log('[[TRAINING DATA START]]')
        console.log(JSON.stringify(floorPlans, null, 2))
        console.log('[[TRAINING DATA END]]')
    }

    if (!floorPlans || floorPlans.length === 0) {
        return (
            <Card className="p-8 text-center text-zinc-500 bg-zinc-50">
                <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <h3 className="font-medium">Engin 3D gögn tiltæk</h3>
                <p className="text-sm mt-1">Ekkert gólfplan fannst fyrir þetta verkefni.</p>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card className="overflow-hidden bg-zinc-950 border-zinc-800 shadow-xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        <div>
                            <h3 className="text-zinc-100 font-medium">Ghost Building</h3>
                            <p className="text-xs text-zinc-400">Lifandi stöðumódel (Live Status Model)</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        BETA
                    </Badge>
                </div>

                {/* 3D Scene */}
                <ProjectScene floorPlans={floorPlans} />

                {/* Legend */}
                <div className="bg-zinc-900 p-4 flex flex-wrap gap-4 text-xs border-t border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-zinc-500" />
                        <span className="text-zinc-400">Skipulagt</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-orange-500" />
                        <span className="text-zinc-400">Járn</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-500" />
                        <span className="text-zinc-400">Steypt/Þornar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        <span className="text-zinc-400">Tilbúið</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span className="text-zinc-400">Afhent</span>
                    </div>
                    <div className="ml-auto text-zinc-600 font-mono">
                        DRAG TO ROTATE // SCROLL TO ZOOM
                    </div>
                </div>
            </Card>

            <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                <strong>Hvernig virkar þetta?</strong> Þetta líkan sýnir rauntíma stöðu á verkefninu þínu. Hver kassi táknar steypueiningu. Þú getur séð hvar framleiðslan er stödd niður á hverja hæð.
            </div>
        </div>
    )
}
