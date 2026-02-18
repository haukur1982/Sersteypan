import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRateLimiter } from '@/lib/utils/rateLimit'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/drawing-prompt'
import { parseDrawingAnalysisResponse } from '@/lib/ai/parse-response'
import { getDrawingAnalysisProvider } from '@/lib/ai/providers'

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

const rateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
})

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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized — Admin only' }, { status: 403 })
  }

  // 4. Rate limit
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  const { success: rateLimitOk } = rateLimiter.check(`analyze-drawing:${user.id}:${ip}`)
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Of margar beiðnir. Reyndu aftur eftir nokkrar mínútur.' },
      { status: 429 }
    )
  }

  // 5. Parse request body
  let body: { documentId: string; projectId: string; analysisId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { documentId, projectId, analysisId } = body
  if (!documentId || !projectId || !analysisId) {
    return NextResponse.json(
      { error: 'documentId, projectId, and analysisId are required' },
      { status: 400 }
    )
  }

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
  await supabase
    .from('drawing_analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId)

  // 11. Send PDF to AI provider
  try {
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    const buildingList =
      buildings && buildings.length > 0
        ? buildings.map((b) => b.name).join(', ')
        : 'Engar byggingar skilgreindar enn (no buildings defined yet)'

    const userPrompt = buildUserPrompt({
      projectName: project?.name || 'Unknown',
      documentName: doc.name,
      buildingList,
    })

    const aiResult = await provider.analyzeDrawing({
      pdfBase64,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 16000,
    })

    // 12. Parse and validate the response
    const parseResult = parseDrawingAnalysisResponse(aiResult.responseText)

    if (!parseResult.success) {
      console.error('Failed to parse AI response:', parseResult.error)
      console.error('Raw response:', parseResult.rawText)

      await supabase
        .from('drawing_analyses')
        .update({
          status: 'failed',
          error_message:
            'AI skilaði ógild JSON svari. Reyndu aftur eða hlaðið upp öðru skjali.',
          ai_confidence_notes: parseResult.rawText,
        })
        .eq('id', analysisId)

      return NextResponse.json(
        { error: 'AI returned invalid JSON response' },
        { status: 500 }
      )
    }

    if (parseResult.validated) {
      // 13a. Full validation passed
      const analysisResult = parseResult.data

      await supabase
        .from('drawing_analyses')
        .update({
          status: 'completed',
          extracted_elements: analysisResult.elements,
          ai_summary: analysisResult.page_description,
          ai_model: aiResult.model,
          ai_confidence_notes: analysisResult.warnings.length > 0
            ? analysisResult.warnings.join('\n')
            : null,
          pages_analyzed: 1,
          page_count: 1,
        })
        .eq('id', analysisId)

      return NextResponse.json({
        analysisId,
        status: 'completed',
        elementsFound: analysisResult.elements.length,
        drawingReference: analysisResult.drawing_reference,
        drawingType: analysisResult.drawing_type,
        building: analysisResult.building,
        warnings: analysisResult.warnings,
        provider: aiResult.provider,
        model: aiResult.model,
      })
    } else {
      // 13b. Partial data salvaged
      const { elements, page_description } = parseResult.data

      await supabase
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

      return NextResponse.json({
        analysisId,
        status: 'completed',
        elementsFound: elements.length,
        warning: 'AI response had validation issues — review data carefully',
        provider: aiResult.provider,
        model: aiResult.model,
      })
    }
  } catch (err) {
    console.error('Error during AI drawing analysis:', err)

    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error during AI analysis'

    await supabase
      .from('drawing_analyses')
      .update({
        status: 'failed',
        error_message: `Greining mistókst: ${errorMessage}`,
      })
      .eq('id', analysisId)

    return NextResponse.json(
      { error: 'AI analysis failed', details: errorMessage },
      { status: 500 }
    )
  }
}
