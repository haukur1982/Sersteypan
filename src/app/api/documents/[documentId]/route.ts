import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  // Fetch document record (RLS ensures user has access)
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

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(path)

  if (downloadError || !fileData) {
    console.error('Error downloading document:', downloadError?.message, { bucket, path, documentId })
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }

  // Determine content type
  const contentTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    image: 'image/jpeg',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }

  // Try to get more specific content type from filename
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

  const contentType = extContentType[ext] || contentTypeMap[doc.file_type || ''] || 'application/octet-stream'

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
