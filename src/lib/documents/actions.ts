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
      ),
      building:buildings (
        id,
        name
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

      if (signError) {
        console.error('Error signing document URL:', signError.message, { bucket, path, docId: doc.id })
      }

      if (!signError && signed?.signedUrl) {
        return { ...doc, file_url: signed.signedUrl }
      }

      // Fallback: if file_url is already a full URL, use it as-is
      if (doc.file_url.startsWith('http')) {
        return doc
      }

      // Last resort: construct a public URL (will only work if bucket is public)
      console.error('Failed to generate signed URL for document:', doc.id, doc.name)
      return { ...doc, file_url: '' }
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
  const category = (formData.get('category') as string) || 'other'
  const elementId = (formData.get('element_id') as string) || null
  const buildingId = (formData.get('building_id') as string) || null
  const floorStr = formData.get('floor') as string
  const floor = floorStr ? parseInt(floorStr, 10) : null

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
      contentType: file.type,
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
  const { data: docRecord, error: dbError } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      name: file.name,
      description: description || null,
      file_url: fileName,
      file_type: fileType,
      file_size_bytes: file.size,
      uploaded_by: user.id,
      category,
      element_id: elementId,
      building_id: buildingId,
      floor: floor,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('Error creating document record:', dbError)
    // Try to delete the uploaded file
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([fileName])
    return { error: 'Failed to save document metadata' }
  }

  // Revalidate project pages
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/factory/projects/${projectId}`)

  return { success: true, message: 'Document uploaded successfully', documentId: docRecord?.id }
}

// Delete document
export async function deleteDocument(documentId: string, projectId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin or factory manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Unauthorized' }
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

  // Revalidate project pages
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/factory/projects/${projectId}`)
  revalidatePath('/factory/drawings')

  return { success: true }
}

// Get drawings linked to a specific element (plus project-level drawings)
export async function getElementDrawings(elementId: string, projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get documents linked to this element OR project-level drawings
  const { data, error } = await supabase
    .from('project_documents')
    .select(`
      *,
      profiles (full_name),
      element:elements (id, name)
    `)
    .eq('project_id', projectId)
    .or(`element_id.eq.${elementId},and(category.eq.drawing,element_id.is.null)`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching element drawings:', error)
    return { error: 'Failed to fetch drawings' }
  }

  // Sign URLs
  const signedDocs = await Promise.all(
    (data || []).map(async (doc) => {
      const { bucket, path } = parseStoragePath(doc.file_url)
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60)
      return { ...doc, file_url: signed?.signedUrl || doc.file_url }
    })
  )

  return { success: true, data: signedDocs }
}

// Get all drawings across all projects (for factory drawings page)
export async function getAllDrawings(options?: { category?: string; projectId?: string; search?: string }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let query = supabase
    .from('project_documents')
    .select(`
      *,
      profiles (full_name),
      project:projects (id, name),
      element:elements (id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (options?.category) {
    query = query.eq('category', options.category)
  }
  if (options?.projectId) {
    query = query.eq('project_id', options.projectId)
  }
  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching all drawings:', error)
    return { error: 'Failed to fetch drawings' }
  }

  // Sign URLs
  const signedDocs = await Promise.all(
    (data || []).map(async (doc) => {
      const { bucket, path } = parseStoragePath(doc.file_url)
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60)
      return { ...doc, file_url: signed?.signedUrl || doc.file_url }
    })
  )

  return { success: true, data: signedDocs }
}
