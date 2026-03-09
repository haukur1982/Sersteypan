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
export function getCadFormat(filename: string): 'dwg' | 'dxf' | null {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'dwg') return 'dwg'
  if (ext === 'dxf') return 'dxf'
  return null
}

/** Create an AbortSignal with timeout, compatible with Node.js */
function createTimeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout is available in Node.js 18+
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  // Fallback for older runtimes
  const controller = new AbortController()
  setTimeout(() => controller.abort(new Error('Timeout')), ms)
  return controller.signal
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

  console.log(
    `[convert-cad] Starting ${format.toUpperCase()} → PDF conversion for: ${filename} (${(fileBuffer.byteLength / 1024).toFixed(0)} KB)`
  )

  const base64Data = Buffer.from(fileBuffer).toString('base64')
  console.log(
    `[convert-cad] Base64 encoded: ${(base64Data.length / 1024).toFixed(0)} KB`
  )

  // ConvertAPI REST endpoint: /convert/{from}/to/{to}
  const endpoint = `${CONVERTAPI_BASE_URL}/convert/${format}/to/pdf`
  console.log(`[convert-cad] POST ${endpoint}`)

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
      signal: createTimeoutSignal(120_000), // 2 min timeout
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[convert-cad] Fetch failed:`, errMsg)

    // Check for timeout (works for both DOMException and AbortError)
    if (
      errMsg.includes('Timeout') ||
      errMsg.includes('timeout') ||
      errMsg.includes('aborted') ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw new CadConversionError(
        'DWG umbreyting tók of langan tíma (>2 mín). Prófaðu minni skrá.',
        'TIMEOUT'
      )
    }
    throw new CadConversionError(
      `Ekki tókst að tengjast ConvertAPI: ${errMsg}`,
      'CONVERSION_FAILED'
    )
  }

  console.log(`[convert-cad] Response status: ${response.status}`)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    console.error(
      `[convert-cad] API error ${response.status}:`,
      errorBody.slice(0, 500)
    )

    if (response.status === 401 || response.status === 403) {
      throw new CadConversionError(
        'ConvertAPI kvóti er uppurinn eða lykill er ógildur. Athugaðu CONVERTAPI_SECRET.',
        'QUOTA_EXCEEDED'
      )
    }

    if (response.status === 400 || response.status === 422) {
      throw new CadConversionError(
        `Ógild DWG/DXF skrá: ${filename}. Skráin gæti verið skemmd eða á óþekktu sniði. (${errorBody.slice(0, 200)})`,
        'INVALID_FILE'
      )
    }

    throw new CadConversionError(
      `ConvertAPI villa (${response.status}): ${errorBody.slice(0, 300)}`,
      'CONVERSION_FAILED'
    )
  }

  // Parse ConvertAPI response
  let result: Record<string, unknown>
  try {
    result = await response.json()
  } catch (jsonErr) {
    console.error('[convert-cad] Failed to parse JSON response:', jsonErr)
    throw new CadConversionError(
      'ConvertAPI skilaði ólæsilegu svari (ekki JSON).',
      'CONVERSION_FAILED'
    )
  }

  console.log(
    `[convert-cad] Response keys: ${Object.keys(result).join(', ')}`
  )

  const files = result?.Files as
    | Array<{ Url?: string; FileData?: string; FileName?: string; FileSize?: number }>
    | undefined

  if (!Array.isArray(files) || files.length === 0) {
    console.error(
      '[convert-cad] No Files in response:',
      JSON.stringify(result).slice(0, 500)
    )
    throw new CadConversionError(
      'ConvertAPI skilaði engri PDF skrá.',
      'CONVERSION_FAILED'
    )
  }

  const pdfFile = files[0]
  console.log(
    `[convert-cad] PDF file: ${pdfFile.FileName || 'unnamed'}, ${pdfFile.FileSize || '?'} bytes, Url: ${pdfFile.Url ? 'yes' : 'no'}, FileData: ${pdfFile.FileData ? 'yes' : 'no'}`
  )

  // ConvertAPI returns either a download Url or inline FileData (base64)
  if (pdfFile.Url) {
    console.log(`[convert-cad] Downloading PDF from: ${pdfFile.Url}`)
    let pdfResponse: Response
    try {
      pdfResponse = await fetch(pdfFile.Url, {
        signal: createTimeoutSignal(60_000), // 1 min timeout for download
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[convert-cad] PDF download failed:`, errMsg)

      if (
        errMsg.includes('Timeout') ||
        errMsg.includes('timeout') ||
        errMsg.includes('aborted')
      ) {
        throw new CadConversionError(
          'Niðurhal á umbreyttri PDF tók of langan tíma.',
          'TIMEOUT'
        )
      }
      throw new CadConversionError(
        `Ekki tókst að sækja umbreytta PDF: ${errMsg}`,
        'DOWNLOAD_FAILED'
      )
    }

    if (!pdfResponse.ok) {
      console.error(
        `[convert-cad] PDF download HTTP ${pdfResponse.status}`
      )
      throw new CadConversionError(
        `Ekki tókst að sækja umbreytta PDF (${pdfResponse.status}).`,
        'DOWNLOAD_FAILED'
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    console.log(
      `[convert-cad] PDF downloaded: ${(pdfBuffer.byteLength / 1024).toFixed(0)} KB`
    )
    return pdfBuffer
  }

  // Fallback: inline base64 FileData
  if (pdfFile.FileData) {
    console.log('[convert-cad] Using inline FileData (base64)')
    const buffer = Buffer.from(pdfFile.FileData, 'base64')
    console.log(
      `[convert-cad] PDF decoded: ${(buffer.byteLength / 1024).toFixed(0)} KB`
    )
    return buffer.buffer as ArrayBuffer
  }

  console.error(
    '[convert-cad] No Url or FileData in response file:',
    JSON.stringify(pdfFile).slice(0, 300)
  )
  throw new CadConversionError(
    'ConvertAPI svar innihélt enga PDF gögn.',
    'CONVERSION_FAILED'
  )
}
