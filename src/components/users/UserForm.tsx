'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser } from '@/lib/users/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { validateUserCreate, formatZodError } from '@/lib/schemas'
import type { Database } from '@/types/database'

type CompanyRow = Database['public']['Tables']['companies']['Row']

interface UserFormProps {
    companies: CompanyRow[]
}

export function UserForm({ companies }: UserFormProps) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<string>('')

    // Client-side validation on blur
    function validateField(name: string, value: string | undefined) {
        const formValues = getFormValues()
        // Update with the current field value
        if (name in formValues) {
            (formValues as Record<string, unknown>)[name] = value
        }

        const result = validateUserCreate(formValues)
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
            // Check if there are any errors left (e.g. cross-field validation)
            // Ideally we re-validate the whole form or just clear this field.
            // For simple fields, clearing this field is enough.
            setFieldErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
    }

    function getFormValues() {
        const form = document.getElementById('user-form') as HTMLFormElement | null
        if (!form) return {}

        const formData = new FormData(form)
        return {
            full_name: formData.get('full_name') as string || '',
            email: formData.get('email') as string || '',
            password: formData.get('password') as string || '',
            phone: formData.get('phone') as string || undefined,
            role: formData.get('role') as string || undefined,
            company_id: formData.get('company_id') as string || undefined,
        }
    }

    // Validate before submit
    function validateForm(): boolean {
        const formValues = getFormValues()
        const result = validateUserCreate(formValues)

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
            const result = await createUser(formData)

            if (result?.error) {
                setError(result.error)
                setLoading(false)
            } else {
                // Server action handles redirect
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
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/admin/users">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Til baka
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Nýr notandi</h1>
                <p className="text-zinc-600 mt-2">Búa til nýjan notanda (Create New User)</p>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Notandaupplýsingar</CardTitle>
                </CardHeader>
                <CardContent>
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Fullt nafn *</Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                placeholder="t.d. Jón Jónsson"
                                disabled={loading}
                                onBlur={(e) => validateField('full_name', e.target.value)}
                                className={fieldErrors.full_name ? 'border-red-500 ring-offset-2 ring-red-500' : ''}
                            />
                            <FieldError name="full_name" />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Netfang *</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="jon@example.com"
                                disabled={loading}
                                onBlur={(e) => validateField('email', e.target.value)}
                                className={fieldErrors.email ? 'border-red-500 ring-offset-2 ring-red-500' : ''}
                            />
                            <FieldError name="email" />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Lykilorð *</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                placeholder="Að minnsta kosti 6 stafir"
                                disabled={loading}
                                onBlur={(e) => validateField('password', e.target.value)}
                                className={fieldErrors.password ? 'border-red-500 ring-offset-2 ring-red-500' : ''}
                            />
                            <p className="text-xs text-zinc-500">
                                Notandinn getur breytt lykilorðinu síðar
                            </p>
                            <FieldError name="password" />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">Símanúmer</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="t.d. 555-1234"
                                disabled={loading}
                                onBlur={(e) => validateField('phone', e.target.value)}
                                className={fieldErrors.phone ? 'border-red-500 ring-offset-2 ring-red-500' : ''}
                            />
                            <FieldError name="phone" />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="role">Hlutverk *</Label>
                            <Select
                                name="role"
                                required
                                onValueChange={(val) => {
                                    setSelectedRole(val);
                                    validateField('role', val);
                                }}
                            >
                                <SelectTrigger className={fieldErrors.role ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Veldu hlutverk" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin - Stjórnandi</SelectItem>
                                    <SelectItem value="factory_manager">Factory Manager - Verkstjóri</SelectItem>
                                    <SelectItem value="buyer">Buyer - Kaupandi</SelectItem>
                                    <SelectItem value="driver">Driver - Bílstjóri</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError name="role" />
                        </div>

                        {/* Company (for buyers only) */}
                        {selectedRole === 'buyer' && (
                            <div className="space-y-2">
                                <Label htmlFor="company_id">
                                    Fyrirtæki *
                                    <span className="text-zinc-500 text-sm ml-2">(Nauðsynlegt fyrir kaupendur)</span>
                                </Label>
                                <Select
                                    name="company_id"
                                    required={selectedRole === 'buyer'}
                                    onValueChange={(val) => validateField('company_id', val)}
                                >
                                    <SelectTrigger className={fieldErrors.company_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Veldu fyrirtæki" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                {company.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError name="company_id" />
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Bý til notanda...
                                    </>
                                ) : (
                                    'Búa til notanda'
                                )}
                            </Button>
                            <Button type="button" variant="outline" asChild disabled={loading}>
                                <Link href="/admin/users">Hætta við</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
