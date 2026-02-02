import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import QRCode from 'npm:qrcode@1.5.3'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, hasRole, isValidUUID, checkRateLimit } from '../_shared/auth.ts'

type RequestBody = {
  element_ids: string[]
}

// Configuration
const MAX_BATCH_SIZE = 50 // Maximum elements per request
const RATE_LIMIT_REQUESTS = 20 // Requests per window
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req)
    if (!auth.success) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check role - only admin and factory_manager can generate QR codes
    if (!hasRole(auth, ['admin', 'factory_manager'])) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin or factory manager role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting
    const rateLimitKey = `qr:${auth.userId}`
    const { allowed, remaining } = checkRateLimit(rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      )
    }

    const body = await req.json() as RequestBody
    const elementIds = Array.isArray(body?.element_ids) ? body.element_ids : []

    if (elementIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'element_ids is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate batch size
    if (elementIds.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_BATCH_SIZE} elements per request` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate all IDs are valid UUIDs
    const invalidIds = elementIds.filter((id) => !isValidUUID(id))
    if (invalidIds.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid UUID format: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createServiceClient()
    const bucket = Deno.env.get('SUPABASE_QR_BUCKET') ?? 'qr-codes'
    const expiresIn = 60 * 60 * 24 * 30 // 30 days

    // Verify all elements exist before processing
    const { data: existingElements, error: fetchError } = await supabase
      .from('elements')
      .select('id')
      .in('id', elementIds)

    if (fetchError) {
      throw new Error(`Failed to verify elements: ${fetchError.message}`)
    }

    const existingIds = new Set((existingElements ?? []).map((e) => e.id))
    const missingIds = elementIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      return new Response(
        JSON.stringify({ error: `Elements not found: ${missingIds.slice(0, 3).join(', ')}${missingIds.length > 3 ? '...' : ''}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: Array<{ element_id: string; qr_url: string }> = []

    for (const elementId of elementIds) {
      const pngBuffer = await QRCode.toBuffer(elementId, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 512,
      })

      const filePath = `${elementId}.png`
      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(filePath, pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadRes.error) {
        throw new Error(`Upload failed for ${elementId}: ${uploadRes.error.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      if (signedError || !signedUrlData?.signedUrl) {
        throw new Error(`Signed URL failed for ${elementId}: ${signedError?.message ?? 'unknown error'}`)
      }

      await supabase
        .from('elements')
        .update({ qr_code_url: publicUrlData.publicUrl })
        .eq('id', elementId)

      results.push({
        element_id: elementId,
        qr_url: signedUrlData.signedUrl,
      })
    }

    return new Response(
      JSON.stringify({ qr_codes: results }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('QR generation error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
