'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, QrCode, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateQRCodesForElements } from '@/lib/elements/actions'
import { generateProjectStatusReport } from '@/lib/reports/actions'

interface ProjectActionButtonsProps {
  projectId: string
  elementIds: string[]
}

export function ProjectActionButtons({ projectId, elementIds }: ProjectActionButtonsProps) {
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const handleGenerateQRCodes = async () => {
    if (elementIds.length === 0) {
      toast.error('No elements to generate QR codes for')
      return
    }

    setIsGeneratingQR(true)
    try {
      const result = await generateQRCodesForElements(elementIds)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`QR codes generated for ${elementIds.length} elements!`)
      // Refresh the page to show new QR codes
      window.location.reload()
    } catch (error) {
      console.error('QR generation error:', error)
      toast.error('Failed to generate QR codes')
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      const result = await generateProjectStatusReport(projectId)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.pdfUrl) {
        // Open the PDF in a new tab
        window.open(result.pdfUrl, '_blank')
        toast.success('Report generated successfully!')
      }
    } catch (error) {
      console.error('Report generation error:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleGenerateQRCodes}
        disabled={isGeneratingQR || elementIds.length === 0}
      >
        {isGeneratingQR ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <QrCode className="mr-2 h-4 w-4" />
            Generate QR Codes
          </>
        )}
      </Button>

      <Button
        variant="outline"
        onClick={handleGenerateReport}
        disabled={isGeneratingReport}
      >
        {isGeneratingReport ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileDown className="mr-2 h-4 w-4" />
            Generate Report
          </>
        )}
      </Button>
    </>
  )
}
