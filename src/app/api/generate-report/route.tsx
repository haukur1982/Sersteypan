import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export const runtime = 'nodejs'

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
})

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as RequestBody
    const supabase = getServiceClient()
    const bucket = process.env.SUPABASE_REPORTS_BUCKET ?? 'reports'
    const expiresIn = 60 * 60 * 24 * 30

    if (body.type === 'project_status') {
      if (!body.project_id) {
        return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, address, status')
        .eq('id', body.project_id)
        .single()

      if (projectError || !project) {
        return NextResponse.json({ error: projectError?.message ?? 'Project not found' }, { status: 404 })
      }

      const { data: elements } = await supabase
        .from('elements')
        .select('id, name, status, priority, weight_kg')
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
        return NextResponse.json({ error: uploadRes.error.message }, { status: 500 })
      }

      const { data: signedUrl } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      return NextResponse.json({ pdf_url: signedUrl?.signedUrl })
    }

    if (body.type === 'delivery_manifest') {
      if (!body.delivery_id) {
        return NextResponse.json({ error: 'delivery_id is required' }, { status: 400 })
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
        return NextResponse.json({ error: deliveryError?.message ?? 'Delivery not found' }, { status: 404 })
      }

      const project = Array.isArray(delivery.project) ? delivery.project[0] : delivery.project
      const items = (delivery.items ?? []).map((item) => ({
        ...item,
        element: Array.isArray(item.element) ? item.element[0] : item.element
      }))

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Delivery Manifest</Text>
            <Text>Project: {project?.name ?? '-'}</Text>
            <Text>Address: {project?.address ?? '-'}</Text>
            <Text>Truck: {delivery.truck_registration ?? '-'}</Text>
            <Text>Planned: {delivery.planned_date ?? '-'}</Text>
            <Text>Generated: {new Date().toLocaleString('is-IS')}</Text>

            <View style={styles.section}>
              <Text style={{ marginBottom: 6 }}>Items</Text>
              {items.map((item) => (
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
        return NextResponse.json({ error: uploadRes.error.message }, { status: 500 })
      }

      const { data: signedUrl } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      return NextResponse.json({ pdf_url: signedUrl?.signedUrl })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
