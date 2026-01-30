import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { pdf, Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@3.4.5'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders } from '../_shared/cors.ts'

type RequestBody = {
  type: 'project_status' | 'delivery_manifest'
  project_id?: string
  delivery_id?: string
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11 },
  title: { fontSize: 16, marginBottom: 8 },
  section: { marginTop: 12 },
  row: { flexDirection: 'row', borderBottom: '1 solid #eee', paddingVertical: 6 },
  col: { flex: 1 },
  label: { color: '#666' }
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as RequestBody
    const supabase = createServiceClient()
    const bucket = Deno.env.get('SUPABASE_REPORTS_BUCKET') ?? 'reports'
    const expiresIn = 60 * 60 * 24 * 30

    if (body.type === 'project_status') {
      if (!body.project_id) {
        return new Response(
          JSON.stringify({ error: 'project_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, address, status, created_at')
        .eq('id', body.project_id)
        .single()

      if (projectError || !project) {
        throw new Error(projectError?.message ?? 'Project not found')
      }

      const { data: elements } = await supabase
        .from('elements')
        .select('id, name, status, priority, weight_kg, delivered_at')
        .eq('project_id', body.project_id)
        .order('created_at', { ascending: false })

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Project Status Report</Text>
            <Text>Project: {project.name}</Text>
            <Text>Address: {project.address ?? '-'}</Text>
            <Text>Status: {project.status ?? '-'}</Text>
            <Text>Generated: {new Date().toLocaleString('is-IS')}</Text>

            <View style={styles.section}>
              <Text style={{ marginBottom: 6 }}>Elements</Text>
              {(elements ?? []).map((el) => (
                <View key={el.id} style={styles.row}>
                  <Text style={styles.col}>{el.name}</Text>
                  <Text style={styles.col}>Status: {el.status ?? '-'}</Text>
                  <Text style={styles.col}>Priority: {el.priority ?? 0}</Text>
                  <Text style={styles.col}>Weight: {el.weight_kg ?? '-'} kg</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      )

      const buffer = await pdf(doc).toBuffer()
      const filePath = `project_status/${project.id}/${Date.now()}.pdf`

      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })

      if (uploadRes.error) {
        throw new Error(uploadRes.error.message)
      }

      const { data: signedUrl } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      return new Response(
        JSON.stringify({ pdf_url: signedUrl?.signedUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.type === 'delivery_manifest') {
      if (!body.delivery_id) {
        return new Response(
          JSON.stringify({ error: 'delivery_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          id,
          truck_registration,
          planned_date,
          project:projects (id, name, address),
          items:delivery_items (
            id,
            element:elements (id, name, element_type, weight_kg)
          )
        `)
        .eq('id', body.delivery_id)
        .single()

      if (deliveryError || !delivery) {
        throw new Error(deliveryError?.message ?? 'Delivery not found')
      }

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Delivery Manifest</Text>
            <Text>Project: {delivery.project?.name ?? '-'}</Text>
            <Text>Address: {delivery.project?.address ?? '-'}</Text>
            <Text>Truck: {delivery.truck_registration ?? '-'}</Text>
            <Text>Planned: {delivery.planned_date ?? '-'}</Text>
            <Text>Generated: {new Date().toLocaleString('is-IS')}</Text>

            <View style={styles.section}>
              <Text style={{ marginBottom: 6 }}>Items</Text>
              {(delivery.items ?? []).map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.col}>{item.element?.name ?? '-'}</Text>
                  <Text style={styles.col}>Type: {item.element?.element_type ?? '-'}</Text>
                  <Text style={styles.col}>Weight: {item.element?.weight_kg ?? '-'} kg</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      )

      const buffer = await pdf(doc).toBuffer()
      const filePath = `delivery_manifest/${delivery.id}/${Date.now()}.pdf`

      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })

      if (uploadRes.error) {
        throw new Error(uploadRes.error.message)
      }

      const { data: signedUrl } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      return new Response(
        JSON.stringify({ pdf_url: signedUrl?.signedUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
