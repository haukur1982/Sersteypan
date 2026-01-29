'use client'

import { useState } from 'react'
import { login } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // If successful, login() will redirect
    } catch (err: unknown) {
      const redirectError = err as { digest?: string } | null
      if (redirectError?.digest?.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Sérsteypan
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Framleiðslukerfi (Production System)
          </p>
        </div>

        <Card className="border-zinc-200 shadow-sm">
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
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
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
          <CardFooter className="flex flex-col space-y-4 border-t bg-zinc-50/50 p-6">
            <div className="text-xs text-center text-zinc-500 w-full">
              <p className="font-medium mb-2">Prófunarreikningar (Test accounts):</p>
              <div className="grid grid-cols-2 gap-2 text-left bg-white p-3 rounded border border-zinc-200">
                <div>
                  <span className="font-semibold block">Admin:</span>
                  admin@sersteypan.test
                </div>
                <div>
                  <span className="font-semibold block">Factory:</span>
                  factory@sersteypan.test
                </div>
                <div>
                  <span className="font-semibold block">Buyer:</span>
                  buyer@sersteypan.test
                </div>
                <div>
                  <span className="font-semibold block">Driver:</span>
                  driver@sersteypan.test
                </div>
                <div className="col-span-2 pt-1 border-t mt-1 text-center">
                  Password: <code className="bg-zinc-100 px-1 rounded border">Password123!</code>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
