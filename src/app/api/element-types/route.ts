import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/schemas/common'
import {
  getElementTypes,
  getAllElementTypes,
  createElementType,
  updateElementType,
  deactivateElementType,
} from '@/lib/element-types/queries'

/**
 * GET /api/element-types
 * Returns all active element types (public access)
 * Query params:
 *   - all=true: Include inactive types (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeAll = searchParams.get('all') === 'true'

    if (includeAll) {
      // Check if user is admin for including inactive types
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

          if (profile?.is_active !== false && profile?.role === 'admin') {
            const types = await getAllElementTypes()
            return NextResponse.json(types)
          }
      }
    }

    // Default: return only active types
    const types = await getElementTypes()
    return NextResponse.json(types)
  } catch (error) {
    console.error('Error fetching element types:', error)
    return NextResponse.json({ error: 'Failed to fetch element types' }, { status: 500 })
  }
}

/**
 * POST /api/element-types
 * Create a new element type (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_active === false || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.key || !body.label_is || !body.label_en) {
      return NextResponse.json(
        { error: 'Missing required fields: key, label_is, label_en' },
        { status: 400 }
      )
    }

    // Validate key format (lowercase, no spaces)
    if (!/^[a-z][a-z0-9_]*$/.test(body.key)) {
      return NextResponse.json(
        { error: 'Key must be lowercase letters, numbers, and underscores, starting with a letter' },
        { status: 400 }
      )
    }

    const newType = await createElementType({
      key: body.key,
      label_is: body.label_is,
      label_en: body.label_en,
      sort_order: body.sort_order ?? 50,
      is_active: body.is_active ?? true,
    })

    return NextResponse.json(newType, { status: 201 })
  } catch (error) {
    console.error('Error creating element type:', error)
    const message = error instanceof Error ? error.message : 'Failed to create element type'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/element-types
 * Update an existing element type (admin only)
 * Body must include 'id' field
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_active === false || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.id || !uuidSchema.safeParse(body.id).success) {
      return NextResponse.json({ error: 'Missing or invalid field: id (must be UUID)' }, { status: 400 })
    }

    // Validate key format if provided
    if (body.key && !/^[a-z][a-z0-9_]*$/.test(body.key)) {
      return NextResponse.json(
        { error: 'Key must be lowercase letters, numbers, and underscores, starting with a letter' },
        { status: 400 }
      )
    }

    const { id, ...updates } = body
    const updatedType = await updateElementType(id, updates)

    return NextResponse.json(updatedType)
  } catch (error) {
    console.error('Error updating element type:', error)
    const message = error instanceof Error ? error.message : 'Failed to update element type'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/element-types
 * Soft delete (deactivate) an element type (admin only)
 * Query param: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_active === false || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id || !uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Missing or invalid param: id (must be UUID)' }, { status: 400 })
    }

    await deactivateElementType(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating element type:', error)
    const message = error instanceof Error ? error.message : 'Failed to deactivate element type'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
