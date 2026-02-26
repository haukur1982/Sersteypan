import { getServerUser } from '@/lib/auth/getServerUser'
import { NotificationPreferencesForm } from '@/components/shared/NotificationPreferencesForm'

export default async function DriverSettingsPage() {
  const user = await getServerUser()
  if (!user) return null

  const storedNotifPrefs = (user.preferences?.notifications ?? undefined) as
    | Record<string, boolean>
    | undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Stillingar
        </h1>
        <p className="text-muted-foreground mt-2">
          Tilkynningastillingar og annað
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
