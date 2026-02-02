import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, hasRole, isValidUUID, checkRateLimit } from '../_shared/auth.ts'

// Using jsPDF which doesn't require JSX
import { jsPDF } from 'npm:jspdf@2.5.2'

type RequestBody = {
  type: 'project_status' | 'delivery_manifest'
  project_id?: string
  delivery_id?: string
}

// Configuration
const RATE_LIMIT_REQUESTS = 10 // Requests per window
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

    // Check role - admin, factory_manager, and buyer can generate reports
    if (!hasRole(auth, ['admin', 'factory_manager', 'buyer'])) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin, factory manager, or buyer role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting
    const rateLimitKey = `report:${auth.userId}`
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

    const body = (await req.json()) as RequestBody
    const supabase = createServiceClient()
    const bucket = Deno.env.get('SUPABASE_REPORTS_BUCKET') ?? 'reports'
    const expiresIn = 60 * 60 * 24 * 30 // 30 days

    const doc = new jsPDF()
    let filePath = ''

    if (body.type === 'project_status') {
      if (!body.project_id) {
        return new Response(
          JSON.stringify({ error: 'project_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate UUID format
      if (!isValidUUID(body.project_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid project_id format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, address, status, created_at')
        .eq('id', body.project_id)
        .single()

      if (projectError || !project) {
        return new Response(
          JSON.stringify({ error: 'Project not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: elements } = await supabase
        .from('elements')
        .select('id, name, status, priority, weight_kg, delivered_at')
        .eq('project_id', body.project_id)
        .order('created_at', { ascending: false })

      // Build PDF
      doc.setFontSize(18)
      doc.text('Project Status Report', 20, 20)

      doc.setFontSize(12)
      doc.text(`Project: ${project.name}`, 20, 35)
      doc.text(`Address: ${project.address ?? '-'}`, 20, 42)
      doc.text(`Status: ${project.status ?? '-'}`, 20, 49)
      doc.text(`Generated: ${new Date().toLocaleString('is-IS')}`, 20, 56)

      doc.setFontSize(14)
      doc.text('Elements', 20, 70)

      let yPos = 80
      doc.setFontSize(10)

      for (const el of elements ?? []) {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(
          `${el.name} | Status: ${el.status ?? '-'} | Priority: ${el.priority ?? 0} | Weight: ${el.weight_kg ?? '-'} kg`,
          20,
          yPos
        )
        yPos += 7
      }

      filePath = `project_status/${project.id}/${Date.now()}.pdf`
    }

    if (body.type === 'delivery_manifest') {
      if (!body.delivery_id) {
        return new Response(
          JSON.stringify({ error: 'delivery_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate UUID format
      if (!isValidUUID(body.delivery_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid delivery_id format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(
          `
          id,
          truck_registration,
          planned_date,
          project:projects (id, name, address),
          items:delivery_items (
            id,
            element:elements (id, name, element_type, weight_kg)
          )
        `
        )
        .eq('id', body.delivery_id)
        .single()

      if (deliveryError || !delivery) {
        return new Response(
          JSON.stringify({ error: 'Delivery not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Type the nested relations
      type ProjectRelation = { name?: string; address?: string } | null
      type ElementRelation = { name?: string; element_type?: string; weight_kg?: number } | null
      type DeliveryItem = { id: string; element: ElementRelation }

      const project = delivery.project as ProjectRelation
      const items = (delivery.items ?? []) as DeliveryItem[]

      // Build PDF
      doc.setFontSize(18)
      doc.text('Delivery Manifest', 20, 20)

      doc.setFontSize(12)
      doc.text(`Project: ${project?.name ?? '-'}`, 20, 35)
      doc.text(`Address: ${project?.address ?? '-'}`, 20, 42)
      doc.text(`Truck: ${delivery.truck_registration ?? '-'}`, 20, 49)
      doc.text(`Planned: ${delivery.planned_date ?? '-'}`, 20, 56)
      doc.text(`Generated: ${new Date().toLocaleString('is-IS')}`, 20, 63)

      doc.setFontSize(14)
      doc.text('Items', 20, 77)

      let yPos = 87
      doc.setFontSize(10)

      for (const item of items) {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        const el = item.element
        doc.text(
          `${el?.name ?? '-'} | Type: ${el?.element_type ?? '-'} | Weight: ${el?.weight_kg ?? '-'} kg`,
          20,
          yPos
        )
        yPos += 7
      }

      filePath = `delivery_manifest/${delivery.id}/${Date.now()}.pdf`
    }

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'Invalid report type. Must be "project_status" or "delivery_manifest".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert to buffer and upload
    const pdfOutput = doc.output('arraybuffer')
    const buffer = new Uint8Array(pdfOutput)

    const uploadRes = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message)
    }

    const { data: signedUrl } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn)

    return new Response(
      JSON.stringify({ pdf_url: signedUrl?.signedUrl }),
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
    console.error('Report generation error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
