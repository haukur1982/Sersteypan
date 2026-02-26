'use client'

import { useActionState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Bell, Volume2, CheckCircle } from 'lucide-react'
import { updateNotificationPreferences } from '@/lib/notifications/actions'
import {
  NOTIFICATION_TYPE_LABELS,
  RELEVANT_TYPES,
  getEffectivePreferences,
  type NotificationPreferences,
} from '@/lib/notifications/preferences'

type Role = 'admin' | 'factory_manager' | 'buyer' | 'driver' | 'rebar_worker'

interface Props {
  role: Role
  storedPreferences: Record<string, boolean> | undefined
}

export function NotificationPreferencesForm({ role, storedPreferences }: Props) {
  const [state, formAction, isPending] = useActionState(updateNotificationPreferences, {
    error: '',
    success: false,
  })
  const prefs = getEffectivePreferences(role, storedPreferences)
  const relevantTypes = RELEVANT_TYPES[role]

  // Split into notification type toggles and display preference toggles
  const notifTypes = relevantTypes.filter(
    (k) => k !== 'toast_enabled' && k !== 'sound_enabled'
  ) as (keyof NotificationPreferences)[]
  const uiTypes = relevantTypes.filter(
    (k) => k === 'toast_enabled' || k === 'sound_enabled'
  ) as (keyof NotificationPreferences)[]

  return (
    <form action={formAction}>
      <div className="space-y-6">
        {/* Notification type toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Tilkynningar
            </CardTitle>
            <CardDescription>
              Veldu hvaða tilkynningar þú vilt fá
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifTypes.map((key) => {
              const { label, description } = NOTIFICATION_TYPE_LABELS[key]
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    name={key}
                    defaultChecked={prefs[key]}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Display preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Birtingarmáti
            </CardTitle>
            <CardDescription>
              Hvernig tilkynningar birtast
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uiTypes.map((key) => {
              const { label, description } = NOTIFICATION_TYPE_LABELS[key]
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    name={key}
                    defaultChecked={prefs[key]}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Feedback */}
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state.success && !state.error && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Stillingar vistaðar
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Vista stillingar
        </Button>
      </div>
    </form>
  )
}
