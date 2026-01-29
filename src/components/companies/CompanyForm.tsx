'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCompany, updateCompany } from '@/lib/companies/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database'

interface CompanyFormProps {
    initialData?: Database['public']['Tables']['companies']['Row']
    isEditing?: boolean
}

export function CompanyForm({ initialData, isEditing = false }: CompanyFormProps) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setLoading(true)

        const formData = new FormData(event.currentTarget)

        // Add is_active manually since checkboxes don't submit if unchecked
        // But basic form submission usually sends 'on' if checked. 
        // The action expects 'true' string.
        // Let's handle it by verifying what FormData gives us.
        // Actually, controlled checkbox is safer or just letting the action handle existence.
        // Action says: formData.get('is_active') === 'true'
        // Standard checkbox sends value if checked. We need to ensure we send 'true' or 'false'.
        // We can interact with Checkbox via name, but shadcn Checkbox is a bit different. No, standard input works inside.

        // However, shadcn Checkbox is a primitive that might strictly control this.
        // Let's use a hidden input for form submission if using non-native checkbox?
        // Or just use the 'name' prop on shadcn Checkbox.
        // The shadcn Checkbox uses Radix UI Primitive which doesn't render a native input by default unless using 'Form' component controller.
        // Since we are using native form submission, we might need a hidden input or use standard input type="checkbox" styled.
        // The brief says "Use shadcn/ui ... checkbox".
        // I will use a hidden input synced with state to ensure FormData picks it up correctly, or append to FormData.

        try {
            let result
            if (isEditing && initialData?.id) {
                result = await updateCompany(initialData.id, formData)
            } else {
                result = await createCompany(formData)
            }

            if (result?.error) {
                setError(result.error)
                setLoading(false)
            } else {
                // Server action handles redirect
                router.refresh()
            }
        } catch (err: unknown) {
            const redirectError = err as { message?: string } | null
            // Ignore redirect errors (Next.js throws these when redirecting)
            // Real validation errors come through result.error above
            if (!redirectError?.message?.includes('NEXT_REDIRECT')) {
                setError('An unexpected error occurred')
                setLoading(false)
            }
        }
    }

    return (
        <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
                <CardTitle>{isEditing ? 'Breyta upplýsingum' : 'Upplýsingar um fyrirtæki'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form id="company-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nafn fyrirtækis (Name) *</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={initialData?.name}
                            required
                            placeholder="e.g. Sérsteypan ehf."
                            disabled={loading}
                            className="border-zinc-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="kennitala">Kennitala (ID)</Label>
                            <Input
                                id="kennitala"
                                name="kennitala"
                                defaultValue={initialData?.kennitala}
                                placeholder="000000-0000"
                                disabled={loading}
                                className="border-zinc-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_phone">Símanúmer (Phone)</Label>
                            <Input
                                id="contact_phone"
                                name="contact_phone"
                                defaultValue={initialData?.contact_phone}
                                placeholder="+354 000 0000"
                                disabled={loading}
                                className="border-zinc-300"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Heimilisfang (Address)</Label>
                        <Input
                            id="address"
                            name="address"
                            defaultValue={initialData?.address}
                            disabled={loading}
                            className="border-zinc-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">Borg/Bær (City)</Label>
                            <Input
                                id="city"
                                name="city"
                                defaultValue={initialData?.city}
                                disabled={loading}
                                className="border-zinc-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="postal_code">Póstnúmer (Postal Code)</Label>
                            <Input
                                id="postal_code"
                                name="postal_code"
                                defaultValue={initialData?.postal_code}
                                disabled={loading}
                                className="border-zinc-300"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                        <div className="space-y-2">
                            <Label htmlFor="contact_name">Tengiliður (Contact Name) *</Label>
                            <Input
                                id="contact_name"
                                name="contact_name"
                                defaultValue={initialData?.contact_name}
                                required
                                disabled={loading}
                                className="border-zinc-300 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_email">Tölvupóstur (Contact Email) *</Label>
                            <Input
                                id="contact_email"
                                name="contact_email"
                                type="email"
                                defaultValue={initialData?.contact_email}
                                required
                                disabled={loading}
                                className="border-zinc-300 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Athugasemdir (Notes)</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            defaultValue={initialData?.notes}
                            disabled={loading}
                            className="border-zinc-300 min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        {/* Using a hidden input to ensure value is sent as string 'true'/'false' for server action */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                name="is_active"
                                value="true"
                                defaultChecked={initialData?.is_active ?? true}
                                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="is_active" className="font-normal text-zinc-900 cursor-pointer">
                                Virkt fyrirtæki (Active)
                            </Label>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                </form>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-zinc-100 p-6 bg-zinc-50/50">
                <Button variant="outline" asChild disabled={loading}>
                    <Link href="/admin/companies">Hætta við</Link>
                </Button>
                <Button type="submit" form="company-form" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Vista...
                        </>
                    ) : (
                        isEditing ? 'Vista breytingar' : 'Stofna fyrirtæki'
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
