'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, updateProject } from '@/lib/projects/actions'
import { getCompanies } from '@/lib/companies/actions'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { validateProjectCreate, formatZodError } from '@/lib/schemas'
import type { Database } from '@/types/database'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']

interface ProjectFormProps {
    initialData?: ProjectRow
    isEditing?: boolean
}

export function ProjectForm({ initialData, isEditing = false }: ProjectFormProps) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [companies, setCompanies] = useState<CompanyRow[]>([])
    const [selectedCompany, setSelectedCompany] = useState<string>(initialData?.company_id || '')
    const [selectedStatus, setSelectedStatus] = useState<string>(initialData?.status || 'planning')

    // Fetch companies on mount
    useEffect(() => {
        async function loadCompanies() {
            const result = await getCompanies()
            if (result.data) {
                const companyList = result.data as CompanyRow[]
                setCompanies(companyList.filter((company) => company.is_active))
            }
        }
        loadCompanies()
    }, [])

    // Client-side validation on blur
    function validateField(name: string, value: string | undefined) {
        const formValues = getFormValues()
        // Update with the current field value
        if (name in formValues) {
            (formValues as Record<string, unknown>)[name] = value
        }

        const result = validateProjectCreate(formValues)
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

            // Special handling for date range validation
            if (name === 'start_date' || name === 'expected_end_date') {
                if (errors.expected_end_date) {
                    setFieldErrors(prev => ({ ...prev, expected_end_date: errors.expected_end_date }))
                } else if (!errors.expected_end_date && fieldErrors.expected_end_date) {
                    // Start date isn't directly validated against end date in field-specific, but refinery runs on whole object
                    // We need to re-check if range is now valid
                    setFieldErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.expected_end_date
                        return newErrors
                    })
                }
            }

        } else {
            setFieldErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                // Also clear date error if present and validation passes
                if ((name === 'start_date' || name === 'expected_end_date') && newErrors.expected_end_date) {
                    delete newErrors.expected_end_date
                }
                return newErrors
            })
        }
    }

    function getFormValues() {
        const form = document.getElementById('project-form') as HTMLFormElement | null
        if (!form) return {}

        const formData = new FormData(form)
        return {
            name: formData.get('name') as string || '',
            company_id: selectedCompany,
            description: formData.get('description') as string || undefined,
            address: formData.get('address') as string || undefined,
            status: selectedStatus,
            start_date: formData.get('start_date') as string || undefined,
            expected_end_date: formData.get('expected_end_date') as string || undefined,
            notes: formData.get('notes') as string || undefined,
        }
    }

    // Validate before submit
    function validateForm(): boolean {
        const formValues = getFormValues()
        const result = validateProjectCreate(formValues)

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

        // Add selected values to FormData (Select component doesn't auto-populate FormData)
        formData.set('company_id', selectedCompany)
        formData.set('status', selectedStatus)

        try {
            let result
            if (isEditing && initialData?.id) {
                result = await updateProject(initialData.id, formData)
            } else {
                result = await createProject(formData)
            }

            if (result?.error) {
                setError(result.error)
                // Set field errors from server response
                if ('errors' in result && result.errors) {
                    setFieldErrors(result.errors as Record<string, string>)
                }
                setLoading(false)
            } else {
                // Server action should handle redirect, but redundancy is fine
                router.refresh()
            }
        } catch (err: unknown) {
            // Ignore redirect errors (Next.js throws these when redirecting)
            // Real validation errors come through result.error above
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
            <CardContent className="pt-6">
                <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Project Name - Required */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nafn verkefnis (Project Name) *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="t.d. Eddufell 6"
                            defaultValue={initialData?.name ?? ''}
                            required
                            disabled={loading}
                            onBlur={(e) => validateField('name', e.target.value)}
                            className={`border-zinc-300 focus:border-blue-500 focus:ring-blue-500 ${fieldErrors.name ? 'border-red-500 ring-offset-2 ring-red-500' : ''}`}
                        />
                        <FieldError name="name" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Dropdown - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="company_id">Fyrirtæki (Company) *</Label>
                            <Select
                                value={selectedCompany}
                                onValueChange={(value) => {
                                    setSelectedCompany(value)
                                    validateField('company_id', value)
                                }}
                                required
                                disabled={loading}
                            >
                                <SelectTrigger className={`border-zinc-300 focus:ring-blue-500 ${fieldErrors.company_id ? 'border-red-500 ring-offset-2 ring-red-500' : ''}`}>
                                    <SelectValue placeholder="Veldu fyrirtæki..." />
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

                        {/* Status Dropdown - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Staða (Status) *</Label>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) => {
                                    setSelectedStatus(value)
                                    validateField('status', value)
                                }}
                                disabled={loading}
                            >
                                <SelectTrigger className="border-zinc-300 focus:ring-blue-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="planning">Skipulagt (Planning)</SelectItem>
                                    <SelectItem value="active">Virkt (Active)</SelectItem>
                                    <SelectItem value="completed">Lokið (Completed)</SelectItem>
                                    <SelectItem value="on_hold">Í bið (On Hold)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description - Optional */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Lýsing (Description)</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Lýsing á verkefninu..."
                            rows={3}
                            defaultValue={initialData?.description ?? ''}
                            disabled={loading}
                            onBlur={(e) => validateField('description', e.target.value)}
                            className="border-zinc-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>

                    {/* Address - Optional */}
                    <div className="space-y-2">
                        <Label htmlFor="address">Heimilisfang (Delivery Address)</Label>
                        <Input
                            id="address"
                            name="address"
                            placeholder="t.d. Eddufellsvegur 6, 112 Reykjavík"
                            defaultValue={initialData?.address ?? ''}
                            disabled={loading}
                            onBlur={(e) => validateField('address', e.target.value)}
                            className="border-zinc-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Byrjunardagur (Start Date)</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="date"
                                defaultValue={initialData?.start_date ?? ''}
                                disabled={loading}
                                onBlur={(e) => validateField('start_date', e.target.value)}
                                className={`border-zinc-300 ${fieldErrors.start_date ? 'border-red-500' : ''}`}
                            />
                            <FieldError name="start_date" />
                        </div>

                        {/* Expected End Date - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="expected_end_date">Áætlaður lokadagur (Expected End Date)</Label>
                            <Input
                                id="expected_end_date"
                                name="expected_end_date"
                                type="date"
                                defaultValue={initialData?.expected_end_date ?? ''}
                                disabled={loading}
                                onBlur={(e) => validateField('expected_end_date', e.target.value)}
                                className={`border-zinc-300 ${fieldErrors.expected_end_date ? 'border-red-500' : ''}`}
                            />
                            <FieldError name="expected_end_date" />
                        </div>
                    </div>

                    {/* Notes - Optional */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Athugasemdir (Notes)</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Athugasemdir..."
                            rows={3}
                            defaultValue={initialData?.notes ?? ''}
                            disabled={loading}
                            className="border-zinc-300"
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                </form>
            </CardContent>

            <CardFooter className="border-t border-zinc-100 bg-zinc-50/50 p-6 flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/projects')}
                    disabled={loading}
                >
                    Hætta við (Cancel)
                </Button>
                <Button type="submit" form="project-form" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditing ? 'Vista...' : 'Stofna...'}
                        </>
                    ) : (
                        isEditing ? 'Vista breytingar' : 'Stofna verkefni'
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
