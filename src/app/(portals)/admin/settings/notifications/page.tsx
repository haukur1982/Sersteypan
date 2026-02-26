import { getServerUser } from '@/lib/auth/getServerUser'
import { NotificationPreferencesForm } from '@/components/shared/NotificationPreferencesForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function AdminNotificationSettingsPage() {
  const user = await getServerUser()
  if (!user) return null

  const storedNotifPrefs = (user.preferences?.notifications ?? undefined) as
    | Record<string, boolean>
    | undefined

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/admin/settings/element-types">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tilkynningastillingar
          </h1>
        </div>
        <p className="text-muted-foreground mt-1 ml-11">
          Hvaða tilkynningar birtast og hvernig
        </p>
      </div>
      <div className="max-w-2xl">
        <NotificationPreferencesForm
          role={user.role}
          storedPreferences={storedNotifPrefs}
        />
      </div>
    </div>
  )
}
