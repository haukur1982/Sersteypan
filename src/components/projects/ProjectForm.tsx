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

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
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
                            className="border-zinc-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Dropdown - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="company_id">Fyrirtæki (Company) *</Label>
                            <Select value={selectedCompany} onValueChange={setSelectedCompany} required disabled={loading}>
                                <SelectTrigger className="border-zinc-300 focus:ring-blue-500">
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
                        </div>

                        {/* Status Dropdown - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Staða (Status) *</Label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={loading}>
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
                                className="border-zinc-300"
                            />
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
                                className="border-zinc-300"
                            />
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
