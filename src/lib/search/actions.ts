'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type CompanyRow = Database['public']['Tables']['companies']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ElementRow = Database['public']['Tables']['elements']['Row']

export type SearchCompany = Pick<CompanyRow, 'id' | 'name' | 'contact_name' | 'contact_email'>
export type SearchProject = Pick<ProjectRow, 'id' | 'name' | 'status' | 'address'> & {
  companies?: Pick<CompanyRow, 'name'> | null
}
export type SearchElement = Pick<ElementRow, 'id' | 'name' | 'element_type' | 'status' | 'floor'> & {
  projects?: (Pick<ProjectRow, 'id' | 'name'> & {
    companies?: Pick<CompanyRow, 'name'> | null
  }) | null
}

export interface SearchResults {
  companies: SearchCompany[]
  projects: SearchProject[]
  elements: SearchElement[]
}

export async function globalSearch(query: string): Promise<{ data?: SearchResults; error?: string }> {
  if (!query || query.trim().length < 2) {
    return { data: { companies: [], projects: [], elements: [] } }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'User profile not found' }
  }

  const searchTerm = `%${query.trim()}%`

  // Search companies (admin only)
  let companies: SearchCompany[] = []
  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('companies')
      .select('id, name, contact_name, contact_email')
      .ilike('name', searchTerm)
      .limit(10)

    companies = data || []
  }

  // Search projects
  let projects: SearchProject[] = []
  if (profile.role === 'admin' || profile.role === 'factory_manager') {
    // Admin and factory managers see all projects
    const { data } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        address,
        companies (
          name
        )
      `)
      .or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`)
      .limit(10)

    projects = data || []
  } else if (profile.role === 'buyer') {
    // Buyers only see their company's projects
    const { data } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        address,
        companies (
          name
        )
      `)
      .eq('company_id', profile.company_id)
      .or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`)
      .limit(10)

    projects = data || []
  }

  // Search elements
  let elements: SearchElement[] = []
  if (profile.role === 'admin' || profile.role === 'factory_manager') {
    // Admin and factory managers see all elements
    const { data } = await supabase
      .from('elements')
      .select(`
        id,
        name,
        element_type,
        status,
        floor,
        projects (
          id,
          name,
          companies (
            name
          )
        )
      `)
      .or(`name.ilike.${searchTerm},position_description.ilike.${searchTerm}`)
      .limit(20)

    elements = data || []
  } else if (profile.role === 'buyer') {
    // Buyers only see elements from their company's projects
    const { data: buyerProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', profile.company_id)

    if (buyerProjects && buyerProjects.length > 0) {
      const projectIds = buyerProjects.map(p => p.id)

      const { data } = await supabase
        .from('elements')
        .select(`
          id,
          name,
          element_type,
          status,
          floor,
          projects (
            id,
            name,
            companies (
              name
            )
          )
        `)
        .in('project_id', projectIds)
        .or(`name.ilike.${searchTerm},position_description.ilike.${searchTerm}`)
        .limit(20)

      elements = data || []
    }
  }

  return {
    data: {
      companies,
      projects,
      elements
    }
  }
}
