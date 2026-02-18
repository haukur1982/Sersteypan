import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/ai/analyze-drawing/status?id=<analysisId>
 *
 * Simple polling endpoint to check the status of a drawing analysis.
 * Used by AnalysisStatusCard to show real-time progress.
 */
export async function GET(request: NextRequest) {
  const analysisId = request.nextUrl.searchParams.get('id')
  if (!analysisId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('drawing_analyses')
    .select('status, elements_created, error_message')
    .eq('id', analysisId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: data.status,
    elementsCreated: data.elements_created,
    errorMessage: data.error_message,
  })
}
