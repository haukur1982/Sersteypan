'use server'

import { createClient } from '@/lib/supabase/server'

export type ReportType = 'project_status' | 'delivery_manifest'

export interface GenerateReportInput {
  type: ReportType
  projectId?: string
  deliveryId?: string
}

export interface GenerateReportResult {
  success?: boolean
  pdfUrl?: string
  error?: string
}

/**
 * Generate a PDF report using the Edge Function.
 * Available report types:
 * - project_status: Requires projectId
 * - delivery_manifest: Requires deliveryId
 */
export async function generateReport(input: GenerateReportInput): Promise<GenerateReportResult> {
  const supabase = await createClient()

  // Get current user and session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return { error: 'No valid session' }
  }

  // Check role - admin, factory_manager, or buyer can generate reports
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager', 'buyer'].includes(profile.role)) {
    return { error: 'Unauthorized - Admin, Factory Manager, or Buyer only' }
  }

  // Validate required fields based on report type
  if (input.type === 'project_status' && !input.projectId) {
    return { error: 'Project ID is required for project status reports' }
  }

  if (input.type === 'delivery_manifest' && !input.deliveryId) {
    return { error: 'Delivery ID is required for delivery manifest reports' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return { error: 'Missing Supabase configuration' }
  }

  // Build request body
  const body: Record<string, string> = { type: input.type }
  if (input.projectId) body.project_id = input.projectId
  if (input.deliveryId) body.delivery_id = input.deliveryId

  // Call Edge Function with user's access token
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('Report generation failed:', errorData)
    return { error: errorData.error || 'Failed to generate report' }
  }

  const data = await response.json()
  return {
    success: true,
    pdfUrl: data.pdf_url,
  }
}

/**
 * Generate a project status report.
 * Convenience wrapper around generateReport.
 */
export async function generateProjectStatusReport(projectId: string): Promise<GenerateReportResult> {
  return generateReport({ type: 'project_status', projectId })
}

/**
 * Generate a delivery manifest report.
 * Convenience wrapper around generateReport.
 */
export async function generateDeliveryManifest(deliveryId: string): Promise<GenerateReportResult> {
  return generateReport({ type: 'delivery_manifest', deliveryId })
}
