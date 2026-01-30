import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import QRCode from 'npm:qrcode@1.5.3'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders } from '../_shared/cors.ts'

type RequestBody = {
  element_ids: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as RequestBody
    const elementIds = Array.isArray(body?.element_ids) ? body.element_ids : []

    if (elementIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'element_ids is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createServiceClient()
    const bucket = Deno.env.get('SUPABASE_QR_BUCKET') ?? 'qr-codes'
    const expiresIn = 60 * 60 * 24 * 30

    const results: Array<{ element_id: string; qr_url: string }> = []

    for (const elementId of elementIds) {
      const pngBuffer = await QRCode.toBuffer(elementId, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 512
      })

      const filePath = `${elementId}.png`
      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(filePath, pngBuffer, {
          contentType: 'image/png',
          upsert: true
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
        qr_url: signedUrlData.signedUrl
      })
    }

    return new Response(
      JSON.stringify({ qr_codes: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
