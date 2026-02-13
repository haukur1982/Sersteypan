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

// Serve document files inline (bypasses signed URL / Content-Disposition issues)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params

  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch document record (RLS ensures user has access to this document)
  const { data: doc, error: docError } = await supabase
    .from('project_documents')
    .select('file_url, name, file_type')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Parse storage path
  let bucket = 'project-documents'
  let path = doc.file_url

  if (doc.file_url.startsWith('http')) {
    const match = doc.file_url.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/)
    if (match) {
      bucket = match[1]
      path = match[2]
    }
  }

  // Download file using service role (bypasses storage RLS — access already verified via DB RLS above)
  const storageClient = getStorageClient()
  const { data: fileData, error: downloadError } = await storageClient.storage
    .from(bucket)
    .download(path)

  if (downloadError || !fileData) {
    console.error('Error downloading document:', downloadError?.message, { bucket, path, documentId })
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }

  // Determine content type from filename extension
  const ext = doc.name?.toLowerCase().split('.').pop() || ''
  const extContentType: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }

  const fileTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    image: 'image/jpeg',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }

  const contentType = extContentType[ext] || fileTypeMap[doc.file_type || ''] || 'application/octet-stream'

  // Return file with inline disposition (opens in browser instead of downloading)
  const buffer = await fileData.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.name || 'document')}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
