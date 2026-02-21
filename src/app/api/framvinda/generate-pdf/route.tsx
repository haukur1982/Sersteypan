import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pdf } from '@react-pdf/renderer'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { expensiveRateLimiter, getClientIP } from '@/lib/utils/rateLimit'
import { FramvindaPdfDocument } from '@/lib/framvinda/pdf-template'

export const runtime = 'nodejs'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

type RequestBody = {
  period_id: string
}

export async function POST(req: Request) {
  try {
    const clientIP = getClientIP(req.headers)
    const rateLimit = await expensiveRateLimiter.check(clientIP)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = (await req.json()) as RequestBody
    if (!body.period_id) {
      return NextResponse.json(
        { error: 'period_id is required' },
        { status: 400 }
      )
    }

    // Auth check
    const userClient = await createUserClient()
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch all data using service client
    const supabase = getServiceClient()

    // Get period
    const { data: period, error: periodError } = await supabase
      .from('framvinda_periods')
      .select('*')
      .eq('id', body.period_id)
      .single()

    if (periodError || !period) {
      return NextResponse.json(
        { error: 'Period not found' },
        { status: 404 }
      )
    }

    // Get contract
    const { data: contract } = await supabase
      .from('framvinda_contracts')
      .select('*')
      .eq('id', period.contract_id)
      .single()

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Get project + company
    const { data: project } = await supabase
      .from('projects')
      .select('name, address, companies(name, kennitala)')
      .eq('id', contract.project_id)
      .single()

    // Get contract lines
    const { data: contractLines } = await supabase
      .from('framvinda_contract_lines')
      .select('*')
      .eq('contract_id', contract.id)
      .order('category')
      .order('sort_order')

    // Get period lines
    const { data: periodLines } = await supabase
      .from('framvinda_period_lines')
      .select('*')
      .eq('period_id', period.id)

    // Get cumulative from prior finalized periods
    const { data: priorPeriods } = await supabase
      .from('framvinda_periods')
      .select('id')
      .eq('contract_id', contract.id)
      .eq('status', 'finalized')
      .lt('period_number', period.period_number)

    const cumulativeBefore: Record<string, number> = {}
    if (priorPeriods && priorPeriods.length > 0) {
      const priorIds = priorPeriods.map((p) => p.id)
      const { data: priorLines } = await supabase
        .from('framvinda_period_lines')
        .select('contract_line_id, quantity_this_period')
        .in('period_id', priorIds)

      for (const pl of priorLines ?? []) {
        cumulativeBefore[pl.contract_line_id] =
          (cumulativeBefore[pl.contract_line_id] ?? 0) + pl.quantity_this_period
      }
    }

    const companies = project?.companies as unknown as { name: string; kennitala: string } | null
    const companyName = companies?.name ?? ''
    const projectName = project?.name ?? ''

    // Generate PDF
    const doc = FramvindaPdfDocument({
      projectName,
      companyName,
      contract,
      contractLines: contractLines ?? [],
      period,
      periodLines: periodLines ?? [],
      cumulativeBefore,
    })

    const buffer = await pdf(doc).toBuffer()

    // Upload to storage
    const bucket = process.env.SUPABASE_REPORTS_BUCKET ?? 'reports'
    const filePath = `framvinda/${contract.project_id}/framvinda_${period.period_number}_${Date.now()}.pdf`

    const uploadRes = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadRes.error) {
      return NextResponse.json(
        { error: uploadRes.error.message },
        { status: 500 }
      )
    }

    const { data: signedUrl } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 30)

    return NextResponse.json({ pdf_url: signedUrl?.signedUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
