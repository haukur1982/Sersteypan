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
import { validateCompanyCreate, formatZodError } from '@/lib/schemas'
import type { Database } from '@/types/database'

interface CompanyFormProps {
    initialData?: Database['public']['Tables']['companies']['Row']
    isEditing?: boolean
}

export function CompanyForm({ initialData, isEditing = false }: CompanyFormProps) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)

    // Client-side validation on blur
    function validateField(name: string, value: string | undefined) {
        const formValues = getFormValues()
        // Update with the current field value
        if (name in formValues) {
            (formValues as Record<string, unknown>)[name] = value
        }

        const result = validateCompanyCreate(formValues)
        if (!result.success) {
            const { errors } = formatZodError(result.error)
            if (errors[name]) {
                setFieldErrors(prev => ({ ...prev, [name]: errors[name] }))
            } else {
                setFieldErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[name]
                    return newErrors
                })
            }
        } else {
            setFieldErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
    }

    function getFormValues() {
        const form = document.getElementById('company-form') as HTMLFormElement | null
        if (!form) return {}

        const formData = new FormData(form)
        return {
            name: formData.get('name') as string || '',
            kennitala: formData.get('kennitala') as string || '',
            address: formData.get('address') as string || undefined,
            postal_code: formData.get('postal_code') as string || undefined,
            city: formData.get('city') as string || undefined,
            phone: formData.get('phone') as string || undefined,
            email: formData.get('email') as string || undefined,
            contact_name: formData.get('contact_name') as string || undefined,
            contact_email: formData.get('contact_email') as string || undefined,
            contact_phone: formData.get('contact_phone') as string || undefined,
            notes: formData.get('notes') as string || undefined,
        }
    }

    // Validate before submit
    function validateForm(): boolean {
        const formValues = getFormValues()
        const result = validateCompanyCreate(formValues)

        if (!result.success) {
            const { error, errors } = formatZodError(result.error)
            setError(error)
            setFieldErrors(errors)
            return false
        }

        setFieldErrors({})
        return true
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        // Client-side validation first
        if (!validateForm()) {
            return
        }

        setLoading(true)

        const formData = new FormData(event.currentTarget)

        try {
            let result
            if (isEditing && initialData?.id) {
                result = await updateCompany(initialData.id, formData)
            } else {
                result = await createCompany(formData)
            }

            if (result?.error) {
                setError(result.error)
                // Set field errors from server response if available
                if ('errors' in result && result.errors) {
                    setFieldErrors(result.errors as Record<string, string>)
                }
                setLoading(false)
            } else {
                router.refresh()
            }
        } catch (err: unknown) {
            const redirectError = err as { message?: string } | null
            if (!redirectError?.message?.includes('NEXT_REDIRECT')) {
                setError('An unexpected error occurred')
                setLoading(false)
            }
        }
    }

    function FieldError({ name }: { name: string }) {
        const errorMessage = fieldErrors[name]
        if (!errorMessage) return null
        return (
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
        )
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
                            defaultValue={initialData?.name ?? ''}
                            required
                            placeholder="e.g. Sérsteypan ehf."
                            disabled={loading}
                            onBlur={(e) => validateField('name', e.target.value)}
                            className={`border-zinc-300 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.name ? 'border-red-500 ring-offset-2 ring-red-500' : ''}`}
                        />
                        <FieldError name="name" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="kennitala">Kennitala (ID)</Label>
                            <Input
                                id="kennitala"
                                name="kennitala"
                                defaultValue={initialData?.kennitala ?? ''}
                                placeholder="000000-0000"
                                disabled={loading}
                                onBlur={(e) => validateField('kennitala', e.target.value)}
                                className={`border-zinc-300 ${fieldErrors.kennitala ? 'border-red-500' : ''}`}
                            />
                            <FieldError name="kennitala" />
                        </div>
                        <div className="space-y-2">
                            {/* This input is named contact_phone in the DB and form, but often companies have a main phone too. 
                                The schema has both checks. I'm binding this input to 'contact_phone' error key. */}
                            <Label htmlFor="contact_phone">Símanúmer (Phone)</Label>
                            <Input
                                id="contact_phone"
                                name="contact_phone"
                                defaultValue={initialData?.contact_phone ?? ''}
                                placeholder="+354 000 0000"
                                disabled={loading}
                                onBlur={(e) => validateField('contact_phone', e.target.value)}
                                className={`border-zinc-300 ${fieldErrors.contact_phone ? 'border-red-500' : ''}`}
                            />
                            <FieldError name="contact_phone" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Heimilisfang (Address)</Label>
                        <Input
                            id="address"
                            name="address"
                            defaultValue={initialData?.address ?? ''}
                            disabled={loading}
                            onBlur={(e) => validateField('address', e.target.value)}
                            className="border-zinc-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">Borg/Bær (City)</Label>
                            <Input
                                id="city"
                                name="city"
                                defaultValue={initialData?.city ?? ''}
                                disabled={loading}
                                onBlur={(e) => validateField('city', e.target.value)}
                                className="border-zinc-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="postal_code">Póstnúmer (Postal Code)</Label>
                            <Input
                                id="postal_code"
                                name="postal_code"
                                defaultValue={initialData?.postal_code ?? ''}
                                disabled={loading}
                                onBlur={(e) => validateField('postal_code', e.target.value)}
                                className={`border-zinc-300 ${fieldErrors.postal_code ? 'border-red-500' : ''}`}
                            />
                            <FieldError name="postal_code" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                        <div className="space-y-2">
                            <Label htmlFor="contact_name">Tengiliður (Contact Name) *</Label>
                            <Input
                                id="contact_name"
                                name="contact_name"
                                defaultValue={initialData?.contact_name ?? ''}
                                required
                                disabled={loading}
                                onBlur={(e) => validateField('contact_name', e.target.value)}
                                className="border-zinc-300 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_email">Tölvupóstur (Contact Email) *</Label>
                            <Input
                                id="contact_email"
                                name="contact_email"
                                type="email"
                                defaultValue={initialData?.contact_email ?? ''}
                                required
                                disabled={loading}
                                onBlur={(e) => validateField('contact_email', e.target.value)}
                                className={`border-zinc-300 focus:border-blue-500 ${fieldErrors.contact_email ? 'border-red-500' : ''}`}
                            />
                            <FieldError name="contact_email" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Athugasemdir (Notes)</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            defaultValue={initialData?.notes ?? ''}
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
