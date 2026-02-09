import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { expensiveRateLimiter, getClientIP } from '@/lib/utils/rateLimit'

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

async function getAuthenticatedUser() {
  const supabase = await createUserClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, supabase }
  }
  return { user, supabase }
}

export async function POST(req: Request) {
  try {
    const clientIP = getClientIP(req.headers)
    const rateLimit = expensiveRateLimiter.check(clientIP)
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
      return NextResponse.json(
        { error: 'Too many report requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const body = await req.json() as RequestBody
    const { user, supabase: userClient } = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Enforce role-based access
    const { data: profile } = await userClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_active === false || !['admin', 'factory_manager', 'buyer'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getServiceClient()
    const bucket = process.env.SUPABASE_REPORTS_BUCKET ?? 'reports'
    const expiresIn = 60 * 60 * 24 * 30

    if (body.type === 'project_status') {
      if (!body.project_id) {
        return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
      }

      // Verify user has access to this project via RLS
      const { data: allowedProject } = await userClient
        .from('projects')
        .select('id')
        .eq('id', body.project_id)
        .single()

      if (!allowedProject) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
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

      // Verify user has access to this delivery via RLS
      const { data: allowedDelivery } = await userClient
        .from('deliveries')
        .select('id')
        .eq('id', body.delivery_id)
        .single()

      if (!allowedDelivery) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
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
