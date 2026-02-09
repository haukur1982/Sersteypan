'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginClient({
  redirectTo,
  errorMessage,
}: {
  redirectTo: string
  errorMessage: string | null
}) {
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sérsteypan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Framleiðslukerfi (Production System)
          </p>
        </div>

        <Card className="border-border shadow-engineered">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Innskráning
            </CardTitle>
            <CardDescription>
              Sláðu inn netfang og lykilorð til að halda áfram
              <span className="block text-xs text-zinc-400 mt-1">
                Enter your email and password to continue
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/auth/login"
              method="post"
              className="space-y-4"
              onSubmit={() => setLoading(true)}
            >
              {redirectTo && (
                <input type="hidden" name="redirectTo" value={redirectTo} />
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Netfang (Email)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jon@example.is"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Lykilorð (Password)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bíðið...
                  </>
                ) : (
                  'Innskrá (Login)'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

