// AI vision analysis of complex engineering drawings can take 60-120s+
// Vercel Pro allows up to 300s (5 minutes)
export const maxDuration = 300

import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { expensiveRateLimiter, getClientIP } from '@/lib/utils/rateLimit'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/drawing-prompt'
import { SURFACE_ANALYSIS_PROMPT, buildSurfaceUserPrompt } from '@/lib/ai/surface-prompt'
import { parseDrawingAnalysisResponse } from '@/lib/ai/parse-response'
import { parseSurfaceAnalysisResponse } from '@/lib/ai/parse-surface-response'
import { getDrawingAnalysisProvider } from '@/lib/ai/providers'
import { convertCadToPdf, CadConversionError, isCadConversionConfigured, getCadFormat } from '@/lib/ai/convert-cad'
import type { Json } from '@/types/database'

/**
 * POST /api/ai/analyze-drawing
 *
 * Analyzes a structural engineering drawing PDF using a configurable AI provider.
 * Extracts precast concrete elements with dimensions, rebar specs, quantities.
 *
 * Body: { documentId: string, projectId: string, analysisId: string }
 *
 * Auth: Admin only.
 * Rate limit: 5 requests per 5 minutes (expensive operation).
 *
 * Provider config (env vars):
 *   AI_DRAWING_PROVIDER = 'anthropic' | 'google'  (default: 'anthropic')
 *   AI_DRAWING_MODEL = model name override (optional)
 */

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createServiceClient(url, key, {
    auth: { persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  // 1. Check if AI analysis is available
  let provider
  try {
    provider = getDrawingAnalysisProvider()
  } catch {
    return NextResponse.json(
      { error: 'AI drawing analysis is not configured' },
      { status: 404 }
    )
  }

  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: `AI drawing analysis provider "${provider.name}" is not configured (missing API key)` },
      { status: 404 }
    )
  }

  // 2. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Role check — admin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active === false || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized — Admin only' }, { status: 403 })
  }

  // 4. Rate limit
  const ip = getClientIP(request.headers)
  const rateLimit = await expensiveRateLimiter.check(`analyze-drawing:${user.id}:${ip}`)
  if (!rateLimit.success) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'Of margar beiðnir. Reyndu aftur eftir nokkrar mínútur.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // 5. Parse request body
  let body: { documentId: string; projectId: string; analysisId: string; analysisMode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { documentId, projectId, analysisId, analysisMode = 'elements' } = body
  if (!documentId || !projectId || !analysisId) {
    return NextResponse.json(
      { error: 'documentId, projectId, and analysisId are required' },
      { status: 400 }
    )
  }

  // 'geometry' mode is now merged into 'surfaces' — treat both the same
  const isSurfaceMode = analysisMode === 'surfaces' || analysisMode === 'geometry'

  // 6. Fetch document record
  const { data: doc, error: docError } = await supabase
    .from('project_documents')
    .select('file_url, name, file_type')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // 6b. Check if document is a CAD file (DWG/DXF) needing conversion
  const isDwg = doc.file_type === 'dwg' || doc.file_type === 'dxf' ||
    !!getCadFormat(doc.file_url) || !!getCadFormat(doc.name)

  if (isDwg && !isCadConversionConfigured()) {
    return NextResponse.json(
      { error: 'DWG umbreyting er ekki stillt. Vantar CONVERTAPI_SECRET umhverfisbreytu.' },
      { status: 500 }
    )
  }

  // 7. Fetch project info for context
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  // 8. Fetch existing buildings for context
  const { data: buildings } = await supabase
    .from('buildings')
    .select('name')
    .eq('project_id', projectId)

  // 9. Download PDF from Supabase Storage
  let pdfBuffer: ArrayBuffer
  try {
    let bucket = 'project-documents'
    let path = doc.file_url

    if (doc.file_url.startsWith('http')) {
      const match = doc.file_url.match(
        /\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/
      )
      if (match) {
        bucket = match[1]
        path = match[2]
      }
    }

    const storageClient = getStorageClient()
    const { data: fileData, error: downloadError } = await storageClient.storage
      .from(bucket)
      .download(path)

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Failed to download')
    }

    pdfBuffer = await fileData.arrayBuffer()
  } catch (err) {
    console.error('Error downloading document for analysis:', err)

    // Update analysis status to failed
    await supabase
      .from('drawing_analyses')
      .update({
        status: 'failed',
        error_message: 'Ekki tókst að sækja skjalið úr gagnageymslu.',
      })
      .eq('id', analysisId)

    return NextResponse.json(
      { error: 'Failed to download document from storage' },
      { status: 500 }
    )
  }

  // 10. Update analysis status to processing
  const serviceClient = getStorageClient()
  await serviceClient
    .from('drawing_analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId)

  // 11. Schedule AI work to run AFTER the response is sent.
  //     The client gets an instant response; Supabase Realtime updates the UI
  //     when the analysis completes or fails in the background.
  after(async () => {
    try {
      // Convert DWG/DXF to PDF if needed, otherwise use the buffer as-is
      let finalBuffer = pdfBuffer
      if (isDwg) {
        console.log(`Converting CAD file to PDF: ${doc.name}`)

        // Show conversion status to user via Realtime
        await serviceClient
          .from('drawing_analyses')
          .update({
            status: 'processing',
            ai_summary: 'Umbreyti DWG skrá í PDF...',
          })
          .eq('id', analysisId)

        try {
          finalBuffer = await convertCadToPdf(pdfBuffer, doc.name)
          console.log(`CAD conversion complete: ${doc.name} (${(finalBuffer.byteLength / 1024 / 1024).toFixed(1)} MB PDF)`)
        } catch (convErr) {
          console.error('CAD conversion failed:', convErr)

          const errorMsg = convErr instanceof CadConversionError
            ? convErr.message
            : 'Ekki tókst að umbreyta DWG skrá í PDF.'

          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'failed',
              error_message: errorMsg,
              ai_summary: null,
            })
            .eq('id', analysisId)
          return // Exit the after() callback
        }
      }

      const pdfBase64 = Buffer.from(finalBuffer).toString('base64')

      const buildingList =
        buildings && buildings.length > 0
          ? buildings.map((b) => b.name).join(', ')
          : 'Engar byggingar skilgreindar enn (no buildings defined yet)'

      // Select prompt and parser based on analysis mode
      const systemPrompt = isSurfaceMode
        ? SURFACE_ANALYSIS_PROMPT
        : SYSTEM_PROMPT
      const userPrompt = isSurfaceMode
        ? buildSurfaceUserPrompt({
            projectName: project?.name || 'Unknown',
            documentName: doc.name,
            buildingList,
          })
        : buildUserPrompt({
            projectName: project?.name || 'Unknown',
            documentName: doc.name,
            buildingList,
          })

      const aiResult = await provider.analyzeDrawing({
        pdfBase64,
        systemPrompt,
        userPrompt,
        maxTokens: 32000,
      })

      if (isSurfaceMode) {
        // ── Surface + geometry analysis mode ──
        const parseResult = parseSurfaceAnalysisResponse(aiResult.responseText)

        if (!parseResult.success) {
          console.error('Failed to parse surface AI response:', parseResult.error)
          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'failed',
              error_message: 'AI skilaði ógild JSON svari. Reyndu aftur.',
              ai_confidence_notes: parseResult.rawText,
            })
            .eq('id', analysisId)
          return
        }

        if (parseResult.validated) {
          const result = parseResult.data
          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'completed',
              extracted_elements: result.surfaces as unknown as Json[],
              ai_summary: result.page_description,
              ai_model: aiResult.model,
              ai_confidence_notes:
                result.warnings.length > 0 ? result.warnings.join('\n') : null,
              pages_analyzed: 1,
              page_count: 1,
            })
            .eq('id', analysisId)
        } else {
          const { surfaces, page_description } = parseResult.data
          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'completed',
              extracted_elements: surfaces as unknown as Json[],
              ai_summary: page_description,
              ai_model: aiResult.model,
              ai_confidence_notes:
                'Svör AI stóðust ekki fulla staðfestingu. Skoðaðu gögn vandlega.',
              pages_analyzed: 1,
            })
            .eq('id', analysisId)
        }

        // ── Auto-save geometry to building_floor_geometries ──
        if (parseResult.geometry) {
          const geo = parseResult.geometry
          try {
            // Get the analysis to find created_by
            const { data: analysisRow } = await serviceClient
              .from('drawing_analyses')
              .select('created_by')
              .eq('id', analysisId)
              .single()

            if (analysisRow) {
              // Determine floor from parsed data
              const parsedFloor = parseResult.validated
                ? parseResult.data.floor ?? 1
                : 1

              await serviceClient
                .from('building_floor_geometries')
                .insert({
                  project_id: projectId,
                  building_id: null,
                  floor: parsedFloor,
                  drawing_analysis_id: analysisId,
                  source_document_name: doc.name,
                  bounding_width_mm: geo.bounding_width_mm,
                  bounding_height_mm: geo.bounding_height_mm,
                  wall_segments: geo.wall_segments as unknown as Record<string, unknown>[],
                  floor_zones: geo.floor_zones as unknown as Record<string, unknown>[],
                  created_by: analysisRow.created_by,
                })

              console.log(
                `Auto-saved geometry: ${geo.wall_segments.length} walls, ${geo.floor_zones.length} zones`
              )
            }
          } catch (geoErr) {
            // Geometry save is best-effort — don't fail the analysis
            console.error('Failed to auto-save geometry:', geoErr)
          }
        }
      } else {
        // ── Element analysis mode (existing) ──
        const parseResult = parseDrawingAnalysisResponse(aiResult.responseText)

        if (!parseResult.success) {
          console.error('Failed to parse AI response:', parseResult.error)
          console.error('Raw response:', parseResult.rawText)

          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'failed',
              error_message:
                'AI skilaði ógild JSON svari. Reyndu aftur eða hlaðið upp öðru skjali.',
              ai_confidence_notes: parseResult.rawText,
            })
            .eq('id', analysisId)
          return
        }

        if (parseResult.validated) {
          const analysisResult = parseResult.data

          // Store full response (with slab_area) when position data is present,
          // otherwise just the elements array for backward compatibility
          const hasSlabArea = analysisResult.slab_area != null
          const extractedData = hasSlabArea
            ? {
                elements: analysisResult.elements,
                slab_area: analysisResult.slab_area,
                drawing_type: analysisResult.drawing_type,
                building: analysisResult.building,
                floor: analysisResult.floor,
              }
            : analysisResult.elements

          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'completed',
              extracted_elements: extractedData as unknown as Json[],
              ai_summary: analysisResult.page_description,
              ai_model: aiResult.model,
              ai_confidence_notes:
                analysisResult.warnings.length > 0
                  ? analysisResult.warnings.join('\n')
                  : null,
              pages_analyzed: 1,
              page_count: 1,
            })
            .eq('id', analysisId)
        } else {
          const { elements, page_description } = parseResult.data

          await serviceClient
            .from('drawing_analyses')
            .update({
              status: 'completed',
              extracted_elements: elements,
              ai_summary: page_description,
              ai_model: aiResult.model,
              ai_confidence_notes:
                'Svör AI stóðust ekki fulla staðfestingu. Skoðaðu gögn vandlega.',
              pages_analyzed: 1,
            })
            .eq('id', analysisId)
        }
      }
    } catch (err) {
      console.error('Background AI analysis failed:', err)

      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error during AI analysis'

      await serviceClient
        .from('drawing_analyses')
        .update({
          status: 'failed',
          error_message: `Greining mistókst: ${errorMessage}`,
        })
        .eq('id', analysisId)
    }
  })

  // 12. Return immediately — client sees instant response
  //     Supabase Realtime subscription in AnalysisListClient handles live updates
  return NextResponse.json({
    status: 'processing',
    analysisId,
    message: 'AI greining í gangi. Niðurstöður birtast sjálfkrafa.',
  })
}
