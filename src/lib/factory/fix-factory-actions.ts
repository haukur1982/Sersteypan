'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FixStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type FixPriority = 'low' | 'normal' | 'high' | 'urgent'
export type FixCategory = 'material' | 'assembly' | 'design' | 'transport' | 'other'

export type FixRequestRecord = {
    id: string
    issue_description: string
    status: FixStatus | string
    priority: FixPriority | string
    category: FixCategory | string | null
    delivery_impact: boolean | null
    resolution_notes: string | null
    completed_at: string | null
    created_at: string | null
    updated_at: string | null
    element: { id: string; name: string } | null
    project: { id: string; name: string } | null
    reporter: { id: string; full_name: string } | null
    assignee: { id: string; full_name: string } | null
}

interface CreateFixRequestData {
    element_id?: string
    project_id?: string
    issue_description: string
    priority?: FixPriority
    category?: FixCategory
    delivery_impact?: boolean
}

/**
 * Create a new fix-in-factory request
 */
export async function createFixRequest(data: CreateFixRequestData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('fix_in_factory')
        .insert({
            element_id: data.element_id || null,
            project_id: data.project_id || null,
            issue_description: data.issue_description,
            priority: data.priority || 'normal',
            category: data.category || 'other',
            delivery_impact: data.delivery_impact || false,
            reported_by: user.id,
        })

    if (error) {
        console.error('Error creating fix request:', error)
        return { error: error.message }
    }

    revalidatePath('/factory/fix-in-factory')
    revalidatePath('/factory')
    return { success: true }
}

/**
 * Update fix request status
 */
export async function updateFixStatus(
    requestId: string,
    status: FixStatus,
    resolutionNotes?: string
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
    }

    if (status === 'in_progress') {
        updateData.assigned_to = user.id
    }

    if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.resolved_by = user.id
        if (resolutionNotes) {
            updateData.resolution_notes = resolutionNotes
        }
    }

    const { error } = await supabase
        .from('fix_in_factory')
        .update(updateData)
        .eq('id', requestId)

    if (error) {
        console.error('Error updating fix status:', error)
        return { error: error.message }
    }

    revalidatePath('/factory/fix-in-factory')
    revalidatePath('/factory')
    return { success: true }
}

/**
 * Get all fix requests with optional status filter
 */
export async function getFixRequests(statusFilter?: FixStatus): Promise<FixRequestRecord[]> {
    const supabase = await createClient()

    let query = supabase
        .from('fix_in_factory')
        .select(`
            id,
            issue_description,
            status,
            priority,
            category,
            delivery_impact,
            resolution_notes,
            completed_at,
            created_at,
            updated_at,
            element:elements (id, name),
            project:projects (id, name),
            reporter:profiles!fix_in_factory_reported_by_fkey (id, full_name),
            assignee:profiles!fix_in_factory_assigned_to_fkey (id, full_name)
        `)
        .order('created_at', { ascending: false })

    if (statusFilter) {
        query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching fix requests:', error)
        return []
    }

    return (data || []) as FixRequestRecord[]
}
