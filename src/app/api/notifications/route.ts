import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUnreadNotifications } from '@/lib/notifications/queries'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await getUnreadNotifications(user.id)

    return NextResponse.json({ notifications }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as {
      notificationId?: string
      notificationIds?: string[]
      all?: boolean
    }

    let ids: string[] = []

    if (body.all) {
      const notifications = await getUnreadNotifications(user.id)
      ids = notifications.filter((n) => !n.read).map((n) => n.id)
    } else if (Array.isArray(body.notificationIds)) {
      ids = body.notificationIds
    } else if (typeof body.notificationId === 'string') {
      ids = [body.notificationId]
    }

    ids = Array.from(new Set(ids.map((s) => (s || '').trim()).filter(Boolean)))
    if (ids.length === 0) {
      return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const rows = ids.map((notification_id) => ({
      user_id: user.id,
      notification_id,
      read_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'user_id,notification_id' })

    if (upsertError) {
      // Migration not applied yet: don't break the UI, just no-op.
      if (upsertError.code === '42P01' || upsertError.message?.includes('notification_reads')) {
        return NextResponse.json({ success: true, skipped: true }, { headers: { 'Cache-Control': 'no-store' } })
      }
      console.error('Failed to mark notifications read:', upsertError)
      return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error marking notifications read:', error)
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}
