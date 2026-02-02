'use client'

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { Pen } from 'lucide-react'

export interface SignatureCanvasRef {
  clear: () => void
  toBlob: () => Promise<Blob | null>
  hasSignature: boolean
}

interface SignatureCanvasProps {
  height?: number
  onSignatureChange?: (hasSignature: boolean) => void
  className?: string
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  function SignatureCanvas({ height = 150, onSignatureChange, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    // Initialize canvas
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size
      canvas.width = canvas.offsetWidth
      canvas.height = height

      // Set drawing style
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Fill with white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [height])

    const getCanvasCoords = useCallback((
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()

      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }, [])

    const startDrawing = useCallback((
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      e.preventDefault()
      setIsDrawing(true)
      setHasSignature(true)
      onSignatureChange?.(true)

      const { x, y } = getCanvasCoords(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }, [getCanvasCoords, onSignatureChange])

    const draw = useCallback((
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      e.preventDefault()
      const { x, y } = getCanvasCoords(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }, [isDrawing, getCanvasCoords])

    const stopDrawing = useCallback(() => {
      setIsDrawing(false)
    }, [])

    const clear = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx || !canvas) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
      onSignatureChange?.(false)
    }, [onSignatureChange])

    const toBlob = useCallback((): Promise<Blob | null> => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current
        if (!canvas) {
          resolve(null)
          return
        }
        canvas.toBlob(resolve, 'image/png')
      })
    }, [])

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      clear,
      toBlob,
      hasSignature
    }), [clear, toBlob, hasSignature])

    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-zinc-700">
            Undirskrift móttakanda *
          </label>
          {hasSignature && (
            <button
              type="button"
              onClick={clear}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Hreinsa
            </button>
          )}
        </div>
        <div className="border-2 border-dashed border-zinc-300 rounded-lg p-1 bg-white">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair touch-none"
            style={{ height }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
          <Pen className="w-3 h-3" />
          Teiknaðu undirskrift með fingri eða mús
        </p>
      </div>
    )
  }
)
