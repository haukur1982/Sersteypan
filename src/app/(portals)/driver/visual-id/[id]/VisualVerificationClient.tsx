'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scene } from '@/components/shared/3d/Scene'
import { ParametricElement } from '@/components/shared/3d/ParametricElement'
import { Button } from '@/components/ui/button'
import { Check, X, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveVisualVerification } from '@/lib/driver/visual-actions'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface VisualVerificationClientProps {
    element: {
        id: string
        name: string
        element_type: string
        length_mm: number | null
        height_mm: number | null
        width_mm: number | null
        status: string | null
    }
}

const REJECTION_REASONS = [
    { id: 'wrong_dimensions', label: 'Rangar mælingar (Wrong dimensions)' },
    { id: 'wrong_type', label: 'Röng tegund (Wrong type)' },
    { id: 'damaged', label: 'Skemmd eining (Damaged element)' },
    { id: 'wrong_element', label: 'Röng eining (Wrong element entirely)' },
    { id: 'other', label: 'Annað (Other)' },
]

export default function VisualVerificationClient({ element }: VisualVerificationClientProps) {
    const router = useRouter()
    const [isVerifying, setIsVerifying] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [selectedReason, setSelectedReason] = useState<string | null>(null)
    const [customNotes, setCustomNotes] = useState('')

    const handleVerify = async () => {
        setIsVerifying(true)

        try {
            const result = await saveVisualVerification({
                elementId: element.id,
                status: 'verified',
            })

            if (result.error) {
                toast.error(result.error)
                setIsVerifying(false)
                return
            }

            toast.success('Eining staðfest! (Element verified!)')

            // Redirect to load page with the confirmed element
            router.push(`/driver/load?element=${element.id}`)
        } catch (error) {
            console.error('Verification error:', error)
            toast.error('Villa kom upp. Reyndu aftur. (An error occurred. Please try again.)')
            setIsVerifying(false)
        }
    }

    const handleReject = async () => {
        if (!selectedReason) {
            toast.error('Vinsamlegast veldu ástæðu (Please select a reason)')
            return
        }

        setIsRejecting(true)

        try {
            const reasonLabel = REJECTION_REASONS.find(r => r.id === selectedReason)?.label || selectedReason
            const rejectionReason = selectedReason === 'other' && customNotes
                ? customNotes
                : reasonLabel

            const result = await saveVisualVerification({
                elementId: element.id,
                status: 'rejected',
                rejectionReason,
                notes: customNotes || undefined,
            })

            if (result.error) {
                toast.error(result.error)
                setIsRejecting(false)
                return
            }

            toast.error('Höfnun skráð. Hafðu samband við verksmiðjustjóra. (Rejection recorded. Contact factory manager.)')
            setShowRejectDialog(false)

            // Go back to scan page
            router.push('/driver/scan')
        } catch (error) {
            console.error('Rejection error:', error)
            toast.error('Villa kom upp. Reyndu aftur.')
            setIsRejecting(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-zinc-50">
            {/* Header / Info Card */}
            <div className="p-4 bg-white border-b z-10 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg leading-none">{element.name}</h1>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            {element.element_type}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2 text-xs font-mono bg-zinc-100 p-2 rounded text-zinc-600">
                    <div>L: {element.length_mm}mm</div>
                    <div className="w-px bg-zinc-300 mx-1"></div>
                    <div>H: {element.height_mm}mm</div>
                    <div className="w-px bg-zinc-300 mx-1"></div>
                    <div>B: {element.width_mm}mm</div>
                </div>
            </div>

            {/* 3D Viewport - Takes remaining height */}
            <div className="flex-1 relative">
                <Scene className="rounded-none border-x-0">
                    <ParametricElement
                        length_mm={element.length_mm}
                        height_mm={element.height_mm}
                        width_mm={element.width_mm}
                        status={element.status}
                        showLabels={true}
                    />
                </Scene>

                {/* Overlay Instruction */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Snúðu til að skoða (Drag to rotate)
                </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white border-t space-y-3 z-10">
                <div className="text-center text-sm font-medium text-zinc-600">
                    Er þetta rétt eining?
                    <br />
                    <span className="text-xs text-muted-foreground font-normal">
                        (Does the physical object match this model?)
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isVerifying}
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                        <X className="w-5 h-5 mr-2" />
                        Nei, villa
                    </Button>

                    <Button
                        size="lg"
                        onClick={handleVerify}
                        disabled={isVerifying || isRejecting}
                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Staðfestir...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5 mr-2" />
                                Já, staðfesta
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Rejection Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Höfnun einingar
                        </DialogTitle>
                        <DialogDescription>
                            Veldu ástæðu fyrir höfnun. Þetta verður tilkynnt verksmiðjustjóra.
                            <br />
                            <span className="text-xs">(Select reason for rejection. Factory manager will be notified.)</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        <Label>Ástæða höfnunar (Rejection reason)</Label>
                        <div className="space-y-2">
                            {REJECTION_REASONS.map((reason) => (
                                <label
                                    key={reason.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedReason === reason.id
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-zinc-200 hover:border-zinc-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="rejection_reason"
                                        value={reason.id}
                                        checked={selectedReason === reason.id}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        className="w-4 h-4 text-red-600"
                                    />
                                    <span className="text-sm">{reason.label}</span>
                                </label>
                            ))}
                        </div>

                        {selectedReason === 'other' && (
                            <div className="pt-2">
                                <Label htmlFor="notes">Athugasemdir (Notes)</Label>
                                <textarea
                                    id="notes"
                                    value={customNotes}
                                    onChange={(e) => setCustomNotes(e.target.value)}
                                    placeholder="Lýstu vandamálinu..."
                                    className="mt-1 w-full p-2 border rounded-md text-sm h-20 resize-none"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectDialog(false)}
                            disabled={isRejecting}
                        >
                            Hætta við
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!selectedReason || isRejecting}
                        >
                            {isRejecting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Skráir...
                                </>
                            ) : (
                                'Staðfesta höfnun'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
