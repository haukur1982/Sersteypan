import { createClient } from '@/lib/supabase/server'

/**
 * Data fetching queries for drawing analysis feature.
 * Used in Server Components.
 */

/** Get all buildings for a project (for building dropdown in review UI) */
export async function getProjectBuildings(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, floors')
    .eq('project_id', projectId)
    .order('name')

  if (error) {
    console.error('Error fetching project buildings:', error)
    return []
  }

  return data || []
}

/** Get existing element names for a project (for duplicate detection) */
export async function getExistingElementNames(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('elements')
    .select('name')
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching element names:', error)
    return []
  }

  return (data || []).map((e) => e.name)
}

/** Get all drawing analyses for a project */
export async function getAnalysesForProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('drawing_analyses')
    .select('id, status, document_name, page_count, pages_analyzed, extracted_elements, ai_summary, ai_confidence_notes, elements_created, error_message, created_at, updated_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching drawing analyses:', error)
    return { error: 'Villa við að sækja greiningar' }
  }

  return { data: data || [] }
}

/** Get all completed/reviewed/committed analyses for a project (for combined view) */
export async function getCompletedAnalyses(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('drawing_analyses')
    .select('id, status, document_name, extracted_elements, ai_summary, elements_created, created_at')
    .eq('project_id', projectId)
    .in('status', ['completed', 'reviewed', 'committed'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching completed analyses:', error)
    return { error: 'Villa við að sækja greiningar' }
  }

  return { data: data || [] }
}

/** Get a single drawing analysis with full data */
export async function getAnalysis(analysisId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('drawing_analyses')
    .select('*, project_documents(id, name, file_url, file_type)')
    .eq('id', analysisId)
    .single()

  if (error) {
    console.error('Error fetching analysis:', error)
    return { error: 'Greining fannst ekki' }
  }

  return { data }
}
