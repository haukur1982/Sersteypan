'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const DOCUMENTS_BUCKET = 'project-documents'

function parseStoragePath(fileUrl: string): { bucket: string; path: string } {
  if (fileUrl.startsWith('http')) {
    const match = fileUrl.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/)
    if (match) {
      return { bucket: match[1], path: match[2] }
    }
  }

  return { bucket: DOCUMENTS_BUCKET, path: fileUrl }
}

// Get documents for a project
export async function getProjectDocuments(projectId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('project_documents')
    .select(`
      *,
      profiles (
        full_name
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return { error: 'Failed to fetch documents' }
  }

  const signedDocuments = await Promise.all(
    (data || []).map(async (doc) => {
      const { bucket, path } = parseStoragePath(doc.file_url)
      const { data: signed, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60)

      if (!signError && signed?.signedUrl) {
        return { ...doc, file_url: signed.signedUrl }
      }

      return doc
    })
  )

  return { success: true, data: signedDocuments }
}

// Upload document
export async function uploadDocument(projectId: string, formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin or factory_manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Unauthorized - Admin or Factory Manager only' }
  }

  // Get file from form data
  const file = formData.get('file') as File
  const description = formData.get('description') as string

  if (!file) {
    return { error: 'No file provided' }
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    return { error: 'File too large. Maximum size is 50MB.' }
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Allowed: PDF, images, Excel, Word' }
  }

  // Generate unique filename
  const timestamp = Date.now()
  const fileName = `${projectId}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase
    .storage
    .from(DOCUMENTS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return { error: `Failed to upload file: ${uploadError.message}` }
  }

  // Determine file type category
  let fileType = 'other'
  if (file.type === 'application/pdf') fileType = 'pdf'
  else if (file.type.startsWith('image/')) fileType = 'image'
  else if (file.type.includes('excel') || file.type.includes('spreadsheet')) fileType = 'excel'
  else if (file.type.includes('word') || file.type.includes('document')) fileType = 'word'

  // Create document record
  const { error: dbError } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      name: file.name,
      description: description || null,
      file_url: fileName,
      file_type: fileType,
      file_size_bytes: file.size,
      uploaded_by: user.id
    })

  if (dbError) {
    console.error('Error creating document record:', dbError)
    // Try to delete the uploaded file
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([fileName])
    return { error: 'Failed to save document metadata' }
  }

  // Revalidate project page
  revalidatePath(`/admin/projects/${projectId}`)

  return { success: true, message: 'Document uploaded successfully' }
}

// Delete document
export async function deleteDocument(documentId: string, projectId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized - Admin only' }
  }

  // Get document to find file path
  const { data: document } = await supabase
    .from('project_documents')
    .select('file_url')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { error: 'Document not found' }
  }

  // Extract file path from URL
  const { bucket, path } = parseStoragePath(document.file_url)

  // Delete from storage
  const { error: storageError } = await supabase
    .storage
    .from(bucket)
    .remove([path])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('project_documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    console.error('Error deleting document record:', dbError)
    return { error: 'Failed to delete document' }
  }

  // Revalidate project page
  revalidatePath(`/admin/projects/${projectId}`)

  return { success: true }
}
