'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ElementWithProject = ElementRow & {
  project: Pick<ProjectRow, 'id' | 'name' | 'address'> | null
}

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Factory QR lookup — allows all element statuses (unlike driver lookup which
 * is restricted to ready/loaded/delivered). Factory workers need to see and
 * update elements at any production stage.
 *
 * QR format: https://app.sersteypan.is/qr/{uuid} OR /element/{uuid} OR plain UUID
 */
export async function factoryLookupElementByQR(qrContent: string): Promise<{
  element: ElementWithProject | null
  error?: string
}> {
  const supabase = await createClient()

  // 1. AUTH CHECK
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { element: null, error: 'Unauthorized' }
  }

  // 2. ROLE CHECK — admin or factory_manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return {
      element: null,
      error: 'Aðgangur bannaður — krefst verksmiðjustjóra eða stjórnanda',
    }
  }

  // 3. PARSE QR CONTENT — supports /qr/{uuid}, /element/{uuid}, or raw UUID
  let elementId: string

  if (qrContent.includes('/qr/') || qrContent.includes('/element/')) {
    const parts = qrContent.split(/\/(?:qr|element)\//)
    elementId = parts[parts.length - 1].split('?')[0].split('#')[0]
  } else {
    elementId = qrContent.trim()
  }

  // 4. VALIDATE
  const isUuid = UUID_REGEX.test(elementId)

  try {
    // 5. FETCH ELEMENT WITH PROJECT CONTEXT
    let query = supabase
      .from('elements')
      .select(
        `
        *,
        project:projects(
          id,
          name,
          address
        )
      `
      )

    if (isUuid) {
      query = query.eq('id', elementId)
    } else {
      query = query.ilike('name', elementId)
    }

    const { data: elements, error } = await query

    if (error || !elements || elements.length === 0) {
      return {
        element: null,
        error: 'Eining fannst ekki. Athugaðu QR kóðann.',
      }
    }

    // If multiple found by name, prefer by production stage order
    let element = elements[0]
    if (elements.length > 1) {
      const statusPriority = [
        'planned',
        'rebar',
        'cast',
        'curing',
        'ready',
        'loaded',
        'delivered',
      ]
      // Pick the element at the earliest production stage
      element = elements.sort(
        (a, b) =>
          statusPriority.indexOf(a.status ?? 'planned') -
          statusPriority.indexOf(b.status ?? 'planned')
      )[0]
    }

    return { element }
  } catch (err) {
    console.error('Factory QR lookup error:', err)
    return { element: null, error: 'Óvænt villa kom upp' }
  }
}
