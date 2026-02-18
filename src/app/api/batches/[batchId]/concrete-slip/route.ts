import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createServiceClient(url, key, {
    auth: { persistSession: false }
  })
}

// Serve concrete slip files from private storage bucket
// Follows the same pattern as /api/documents/[documentId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params

  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch batch record (RLS ensures user has access)
  const { data: batch, error: batchError } = await supabase
    .from('production_batches')
    .select('concrete_slip_url, concrete_slip_name')
    .eq('id', batchId)
    .single()

  if (batchError || !batch || !batch.concrete_slip_url) {
    return NextResponse.json({ error: 'Concrete slip not found' }, { status: 404 })
  }

  // Parse storage path — handle both raw paths and legacy full URLs
  let storagePath = batch.concrete_slip_url
  if (storagePath.startsWith('http')) {
    const match = storagePath.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/)
    if (match) {
      storagePath = match[2]
    }
  }

  // Download file using service role (bypasses storage RLS — access already verified via DB RLS above)
  const storageClient = getStorageClient()
  const { data: fileData, error: downloadError } = await storageClient.storage
    .from('project-documents')
    .download(storagePath)

  if (downloadError || !fileData) {
    console.error('Error downloading concrete slip:', downloadError?.message, { storagePath, batchId })
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }

  // Determine content type from filename extension
  const ext = (batch.concrete_slip_name || '').toLowerCase().split('.').pop() || ''
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  const contentType = contentTypes[ext] || 'application/octet-stream'

  // Return file with inline disposition (opens in browser instead of downloading)
  const buffer = await fileData.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(batch.concrete_slip_name || 'concrete-slip')}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
