'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Get todo items for current user
export async function getTodoItems() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch todos for current user
  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      id,
      title,
      description,
      due_date,
      priority,
      is_completed,
      completed_at,
      created_at,
      updated_at,
      project_id,
      projects (
        name
      )
    `)
    .eq('user_id', user.id)
    .order('is_completed', { ascending: true })
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching todo items:', error)
    return { error: 'Failed to fetch todo items' }
  }

  return { success: true, data }
}

// Get a single todo item
export async function getTodoItem(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('todo_items')
    .select(`
      *,
      projects (
        name
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching todo item:', error)
    return { error: 'Todo item not found' }
  }

  return { success: true, data }
}

// Create a new todo item
export async function createTodoItem(formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Extract and validate form data
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const due_date = (formData.get('due_date') as string) || null
  const priority = formData.get('priority') ? parseInt(formData.get('priority') as string) : 0
  const project_id = (formData.get('project_id') as string) || null

  if (!title || title.trim().length === 0) {
    return { error: 'Title is required' }
  }

  // Prepare todo item data
  const todoData = {
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    due_date,
    priority,
    project_id,
    is_completed: false
  }

  // Insert into database
  const { error } = await supabase
    .from('todo_items')
    .insert(todoData)
    .select()
    .single()

  if (error) {
    console.error('Error creating todo item:', error)
    return { error: 'Failed to create todo item. Please try again.' }
  }

  // Revalidate the todos pages
  revalidatePath('/factory/todos')

  // Redirect to todos list
  redirect('/factory/todos')
}

// Update a todo item
export async function updateTodoItem(id: string, formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: existingTodo } = await supabase
    .from('todo_items')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existingTodo || existingTodo.user_id !== user.id) {
    return { error: 'Todo item not found or unauthorized' }
  }

  // Extract and validate form data
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const due_date = (formData.get('due_date') as string) || null
  const priority = formData.get('priority') ? parseInt(formData.get('priority') as string) : 0
  const project_id = (formData.get('project_id') as string) || null

  if (!title || title.trim().length === 0) {
    return { error: 'Title is required' }
  }

  // Prepare update data
  const updateData = {
    title: title.trim(),
    description: description?.trim() || null,
    due_date,
    priority,
    project_id,
    updated_at: new Date().toISOString()
  }

  // Update in database
  const { error } = await supabase
    .from('todo_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating todo item:', error)
    return { error: 'Failed to update todo item. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/factory/todos')
  revalidatePath(`/factory/todos/${id}/edit`)

  // Redirect to todos list
  redirect('/factory/todos')
}

// Toggle todo completion status
export async function toggleTodoCompletion(id: string, isCompleted: boolean) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: existingTodo } = await supabase
    .from('todo_items')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existingTodo || existingTodo.user_id !== user.id) {
    return { error: 'Todo item not found or unauthorized' }
  }

  // Update completion status
  const updateData: Database['public']['Tables']['todo_items']['Update'] = {
    is_completed: isCompleted,
    updated_at: new Date().toISOString(),
    completed_at: isCompleted ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from('todo_items')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error toggling todo completion:', error)
    return { error: 'Failed to update todo status' }
  }

  // Revalidate pages
  revalidatePath('/factory/todos')
  revalidatePath('/factory')

  return { success: true }
}

// Delete a todo item
export async function deleteTodoItem(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: todo } = await supabase
    .from('todo_items')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!todo || todo.user_id !== user.id) {
    return { error: 'Todo item not found or unauthorized' }
  }

  // Delete the todo
  const { error } = await supabase
    .from('todo_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting todo item:', error)
    return { error: 'Failed to delete todo item. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/factory/todos')
  revalidatePath('/factory')

  return { success: true }
}
