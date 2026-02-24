import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/auth/getServerUser'
import { QrElementPublic } from './QrElementPublic'

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase configuration')
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

type ElementPublicData = {
  id: string
  name: string
  element_type: string
  status: string
  weight_kg: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  qr_code_url: string | null
  created_at: string | null
  rebar_completed_at: string | null
  cast_at: string | null
  curing_completed_at: string | null
  ready_at: string | null
  delivered_at: string | null
  project: { name: string } | null
}

export default async function QrLandingPage({
  params,
}: {
  params: Promise<{ elementId: string }>
}) {
  const { elementId } = await params

  // Validate UUID format
  if (!UUID_REGEX.test(elementId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">&#x26A0;&#xFE0F;</div>
          <h1 className="text-xl font-semibold text-zinc-800">
            Eining fannst ekki
          </h1>
          <p className="text-zinc-500 text-sm">
            QR k&oacute;di er &oacute;gildur.
          </p>
        </div>
      </div>
    )
  }

  // Check if user is logged in — redirect to their portal
  const user = await getServerUser()

  if (user) {
    switch (user.role) {
      case 'admin':
      case 'factory_manager':
        // Admin/factory have element detail page at /factory/production/{id}
        redirect(`/factory/production/${elementId}`)
        break
      case 'buyer':
        // Buyer portal has no element detail page — redirect to projects list
        redirect('/buyer/projects')
        break
      case 'driver':
        // Driver scans elements for loading — redirect to scan page
        redirect('/driver/scan')
        break
      case 'rebar_worker':
        // Rebar worker scans elements — redirect to rebar element detail
        redirect(`/rebar/element/${elementId}`)
        break
      default:
        // Unknown role — fall through to public view
        break
    }
  }

  // Public view — fetch limited data via service role
  const supabase = getServiceRoleClient()

  const { data: element, error } = await supabase
    .from('elements')
    .select(
      `
      id,
      name,
      element_type,
      status,
      weight_kg,
      length_mm,
      width_mm,
      height_mm,
      qr_code_url,
      created_at,
      rebar_completed_at,
      cast_at,
      curing_completed_at,
      ready_at,
      delivered_at,
      project:projects(name)
    `
    )
    .eq('id', elementId)
    .single()

  if (error || !element) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">&#x1F50D;</div>
          <h1 className="text-xl font-semibold text-zinc-800">
            Eining fannst ekki
          </h1>
          <p className="text-zinc-500 text-sm">
            &THORN;essi eining er ekki til &iacute; kerfinu.
          </p>
        </div>
      </div>
    )
  }

  // Supabase returns joined project as array or object depending on relation
  const project = Array.isArray(element.project)
    ? element.project[0]
    : element.project

  const publicData: ElementPublicData = {
    ...element,
    project: project ?? null,
  }

  return <QrElementPublic element={publicData} />
}
