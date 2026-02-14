import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications/queries'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await getUserNotifications(user.id)

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
      all?: boolean
    }

    if (body.all) {
      await markAllNotificationsRead(user.id)
    } else if (typeof body.notificationId === 'string') {
      await markNotificationRead(body.notificationId, user.id)
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error marking notifications read:', error)
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}
