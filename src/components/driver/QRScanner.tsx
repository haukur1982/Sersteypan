'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, XCircle, RotateCcw, Flashlight } from 'lucide-react'

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onError?: (error: string) => void
    className?: string
}

export function QRScanner({ onScan, onError, className = '' }: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [hasCamera, setHasCamera] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [currentCameraIdx, setCurrentCameraIdx] = useState(0)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Initialize scanner
    useEffect(() => {
        const scannerId = 'qr-scanner-container'

        // Check if container exists
        if (!document.getElementById(scannerId)) {
            return
        }

        scannerRef.current = new Html5Qrcode(scannerId)

        // Get available cameras
        Html5Qrcode.getCameras()
            .then((devices) => {
                if (devices && devices.length > 0) {
                    setCameras(devices.map((d) => ({ id: d.id, label: d.label })))
                    setHasCamera(true)
                } else {
                    setHasCamera(false)
                    setError('Enginn myndavél fannst')
                }
            })
            .catch((err) => {
                console.error('Camera access error:', err)
                setHasCamera(false)
                setError('Gat ekki fengið aðgang að myndavél')
            })

        return () => {
            if (scannerRef.current) {
                const state = scannerRef.current.getState()
                if (state === Html5QrcodeScannerState.SCANNING) {
                    scannerRef.current.stop().catch(console.error)
                }
            }
        }
    }, [])

    const startScanning = useCallback(async () => {
        if (!scannerRef.current || cameras.length === 0) return

        setError(null)
        setIsScanning(true)

        try {
            await scannerRef.current.start(
                cameras[currentCameraIdx].id,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Success - pause scanning and call handler
                    onScan(decodedText)
                    // Don't auto-stop, let parent decide
                },
                (errorMessage) => {
                    // Ignore continuous scan errors (no QR in frame)
                    if (!errorMessage.includes('No QR code found')) {
                        console.log('Scan frame error:', errorMessage)
                    }
                }
            )
        } catch (err) {
            console.error('Failed to start scanner:', err)
            setError('Gat ekki ræst skönnun')
            setIsScanning(false)
            onError?.('Failed to start scanner')
        }
    }, [cameras, currentCameraIdx, onScan, onError])

    const stopScanning = useCallback(async () => {
        if (!scannerRef.current) return

        try {
            const state = scannerRef.current.getState()
            if (state === Html5QrcodeScannerState.SCANNING) {
                await scannerRef.current.stop()
            }
        } catch (err) {
            console.error('Failed to stop scanner:', err)
        }
        setIsScanning(false)
    }, [])

    const switchCamera = useCallback(async () => {
        if (cameras.length <= 1) return

        await stopScanning()
        setCurrentCameraIdx((prev) => (prev + 1) % cameras.length)
        // Will restart on next startScanning call
    }, [cameras.length, stopScanning])

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Scanner viewport */}
            <div className="relative aspect-square max-w-md mx-auto bg-black rounded-xl overflow-hidden">
                <div
                    id="qr-scanner-container"
                    ref={containerRef}
                    className="w-full h-full"
                />

                {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
                        <div className="text-center text-white space-y-4">
                            <Camera className="w-16 h-16 mx-auto text-zinc-400" />
                            <p className="text-lg">QR Skanni</p>
                            <p className="text-sm text-zinc-400">
                                Skannaðu QR kóða á steypu
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 justify-center">
                {!isScanning ? (
                    <Button
                        onClick={startScanning}
                        disabled={!hasCamera}
                        size="lg"
                        className="min-w-[160px]"
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        Byrja skönnun
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={stopScanning}
                            variant="outline"
                            size="lg"
                        >
                            <XCircle className="w-5 h-5 mr-2" />
                            Stöðva
                        </Button>

                        {cameras.length > 1 && (
                            <Button
                                onClick={switchCamera}
                                variant="outline"
                                size="lg"
                            >
                                <RotateCcw className="w-5 h-5 mr-2" />
                                Skipta um myndavél
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* Camera info */}
            {isScanning && cameras.length > 0 && (
                <p className="text-center text-sm text-zinc-500">
                    Myndavél: {cameras[currentCameraIdx]?.label || 'Óþekkt'}
                </p>
            )}
        </div>
    )
}
