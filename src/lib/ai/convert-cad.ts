/**
 * DWG/DXF → PDF conversion via ConvertAPI.
 *
 * ConvertAPI uses a CAD-specific engine with paper space / model space
 * control, layer export, and page sizing — critical for architectural
 * drawing fidelity.
 *
 * Uses the REST API directly (no SDK dependency).
 *
 * Env: CONVERTAPI_SECRET
 *
 * @see https://www.convertapi.com/dwg-to-pdf
 */

const CONVERTAPI_BASE_URL = 'https://v2.convertapi.com'

export type CadConversionErrorCode =
  | 'NO_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'CONVERSION_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'TIMEOUT'
  | 'INVALID_FILE'

export class CadConversionError extends Error {
  constructor(
    message: string,
    public readonly code: CadConversionErrorCode
  ) {
    super(message)
    this.name = 'CadConversionError'
  }
}

/** Check if CONVERTAPI_SECRET env var is set */
export function isCadConversionConfigured(): boolean {
  return !!process.env.CONVERTAPI_SECRET
}

/** Detect CAD file type from filename extension */
export function getCadFormat(
  filename: string
): 'dwg' | 'dxf' | null {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'dwg') return 'dwg'
  if (ext === 'dxf') return 'dxf'
  return null
}

/**
 * Convert a DWG or DXF file to PDF using ConvertAPI.
 *
 * Key parameters for architectural quality:
 * - SpaceToConvert: 'all' — export all paper space layouts (the proper sheets)
 * - ColorSpace: 'truecolors' — preserve full color
 * - StoreFile: true — result stored temporarily, download via URL
 *
 * @param fileBuffer Raw bytes of the DWG/DXF file
 * @param filename   Original filename (used to detect format)
 * @returns ArrayBuffer of the converted PDF
 */
export async function convertCadToPdf(
  fileBuffer: ArrayBuffer,
  filename: string
): Promise<ArrayBuffer> {
  const secret = process.env.CONVERTAPI_SECRET
  if (!secret) {
    throw new CadConversionError(
      'CONVERTAPI_SECRET er ekki stillt. Stilltu umhverfisbreytu til að virkja DWG umbreytingu.',
      'NO_API_KEY'
    )
  }

  const format = getCadFormat(filename)
  if (!format) {
    throw new CadConversionError(
      `Óþekkt CAD skráarsnið: ${filename}. Aðeins DWG og DXF eru studd.`,
      'INVALID_FILE'
    )
  }

  const base64Data = Buffer.from(fileBuffer).toString('base64')

  // ConvertAPI REST endpoint: /convert/{from}/to/{to}
  const endpoint = `${CONVERTAPI_BASE_URL}/convert/${format}/to/pdf`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Name: filename,
              Data: base64Data,
            },
          },
          // Export all paper space layouts (the architectural sheets)
          { Name: 'SpaceToConvert', Value: 'all' },
          // Preserve full color for annotations and hatching
          { Name: 'ColorSpace', Value: 'truecolors' },
          // Store result on ConvertAPI servers for download
          { Name: 'StoreFile', Value: 'true' },
        ],
      }),
      signal: AbortSignal.timeout(120_000), // 2 min timeout
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new CadConversionError(
        'DWG umbreyting tók of langan tíma (>2 mín). Prófaðu minni skrá.',
        'TIMEOUT'
      )
    }
    throw new CadConversionError(
      `Ekki tókst að tengjast ConvertAPI: ${err instanceof Error ? err.message : String(err)}`,
      'CONVERSION_FAILED'
    )
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')

    if (response.status === 403) {
      throw new CadConversionError(
        'ConvertAPI kvóti er uppurinn eða lykill er ógildur. Athugaðu CONVERTAPI_SECRET.',
        'QUOTA_EXCEEDED'
      )
    }

    if (response.status === 400 || response.status === 422) {
      throw new CadConversionError(
        `Ógild DWG/DXF skrá: ${filename}. Skráin gæti verið skemmd eða á óþekktu sniði.`,
        'INVALID_FILE'
      )
    }

    throw new CadConversionError(
      `ConvertAPI villa (${response.status}): ${errorBody.slice(0, 300)}`,
      'CONVERSION_FAILED'
    )
  }

  // Parse ConvertAPI response — contains Files array with Url or FileData
  const result = await response.json()
  const files = result?.Files

  if (!Array.isArray(files) || files.length === 0) {
    throw new CadConversionError(
      'ConvertAPI skilaði engri PDF skrá.',
      'CONVERSION_FAILED'
    )
  }

  const pdfFile = files[0]

  // ConvertAPI returns either a download Url or inline FileData (base64)
  if (pdfFile.Url) {
    // Download the converted PDF from ConvertAPI's temporary storage
    let pdfResponse: Response
    try {
      pdfResponse = await fetch(pdfFile.Url, {
        signal: AbortSignal.timeout(60_000), // 1 min timeout for download
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new CadConversionError(
          'Niðurhal á umbreyttri PDF tók of langan tíma.',
          'TIMEOUT'
        )
      }
      throw new CadConversionError(
        `Ekki tókst að sækja umbreytta PDF: ${err instanceof Error ? err.message : String(err)}`,
        'DOWNLOAD_FAILED'
      )
    }

    if (!pdfResponse.ok) {
      throw new CadConversionError(
        `Ekki tókst að sækja umbreytta PDF (${pdfResponse.status}).`,
        'DOWNLOAD_FAILED'
      )
    }

    return await pdfResponse.arrayBuffer()
  }

  // Fallback: inline base64 FileData
  if (pdfFile.FileData) {
    return Buffer.from(pdfFile.FileData, 'base64').buffer as ArrayBuffer
  }

  throw new CadConversionError(
    'ConvertAPI svar innihélt enga PDF gögn.',
    'CONVERSION_FAILED'
  )
}
