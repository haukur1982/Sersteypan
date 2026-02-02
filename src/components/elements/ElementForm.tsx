'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createElement, updateElement } from '@/lib/elements/actions'
import { getProjects } from '@/lib/projects/actions'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { validateElementCreate, formatZodError } from '@/lib/schemas'
import { ElementTypeSelect } from '@/components/elements/ElementTypeSelect'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ProjectOption = Pick<ProjectRow, 'id' | 'name' | 'status'>

interface ElementFormProps {
    initialData?: ElementRow
    isEditing?: boolean
    preselectedProjectId?: string
}

// Helper to parse number from input
function parseNumberInput(value: string): number | undefined {
    if (!value || value === '') return undefined
    const num = Number(value)
    return isNaN(num) ? undefined : num
}

export function ElementForm({ initialData, isEditing = false, preselectedProjectId }: ElementFormProps) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [selectedProject, setSelectedProject] = useState<string>(
        preselectedProjectId || initialData?.project_id || ''
    )
    const [selectedElementType, setSelectedElementType] = useState<string>(initialData?.element_type || 'wall')
    const [selectedStatus, setSelectedStatus] = useState<string>(initialData?.status ?? 'planned')

    // Fetch projects on mount
    useEffect(() => {
        async function loadProjects() {
            const result = await getProjects()
            if (result.data) {
                const projectList = result.data as ProjectOption[]
                setProjects(projectList.filter((project) => project.status !== 'completed'))
            }
        }
        loadProjects()
    }, [])

    // Client-side validation on blur
    function validateField(name: string, value: string | number | undefined) {
        const formValues = getFormValues()
        // Update with the current field value
        if (name in formValues) {
            (formValues as Record<string, unknown>)[name] = value
        }

        const result = validateElementCreate(formValues)
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
        const form = document.getElementById('element-form') as HTMLFormElement | null
        if (!form) return {}

        const formData = new FormData(form)
        return {
            name: formData.get('name') as string || '',
            project_id: selectedProject,
            element_type: selectedElementType,
            status: selectedStatus,
            priority: parseNumberInput(formData.get('priority') as string) ?? 0,
            floor: formData.get('floor') as string || undefined,
            position_description: formData.get('position_description') as string || undefined,
            length_mm: parseNumberInput(formData.get('length_mm') as string),
            width_mm: parseNumberInput(formData.get('width_mm') as string),
            height_mm: parseNumberInput(formData.get('height_mm') as string),
            weight_kg: parseNumberInput(formData.get('weight_kg') as string),
            drawing_reference: formData.get('drawing_reference') as string || undefined,
            production_notes: formData.get('production_notes') as string || undefined,
        }
    }

    // Validate before submit
    function validateForm(): boolean {
        const formValues = getFormValues()
        const result = validateElementCreate(formValues)

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

        // Add selected values to FormData
        formData.set('project_id', selectedProject)
        formData.set('element_type', selectedElementType)
        formData.set('status', selectedStatus)

        try {
            let result
            if (isEditing && initialData?.id) {
                result = await updateElement(initialData.id, formData)
            } else {
                result = await createElement(formData)
            }

            if (result?.error) {
                setError(result.error)
                // Set field errors from server response
                if ('errors' in result && result.errors) {
                    setFieldErrors(result.errors as Record<string, string>)
                }
                setLoading(false)
            } else {
                router.refresh()
            }
        } catch (err: unknown) {
            const redirectError = err as { message?: string } | null
            if (redirectError?.message && redirectError.message.includes('NEXT_REDIRECT')) {
                return
            }
            setError('Óvænt villa kom upp')
            setLoading(false)
        }
    }

    // Field error display component
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
                <form id="element-form" onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-900">Grunnupplýsingar (Basic Info)</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Element Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nafn (Name) *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="t.d. F-13"
                                    defaultValue={initialData?.name ?? ''}
                                    required
                                    disabled={loading}
                                    onBlur={(e) => validateField('name', e.target.value)}
                                    className={`border-zinc-300 focus:ring-blue-500 ${fieldErrors.name ? 'border-red-500' : ''}`}
                                />
                                <FieldError name="name" />
                            </div>

                            {/* Project Dropdown */}
                            <div className="space-y-2">
                                <Label htmlFor="project_id">Verkefni (Project) *</Label>
                                <Select
                                    value={selectedProject}
                                    onValueChange={(value) => {
                                        setSelectedProject(value)
                                        validateField('project_id', value)
                                    }}
                                    required
                                    disabled={loading || !!preselectedProjectId}
                                >
                                    <SelectTrigger className={`border-zinc-300 focus:ring-blue-500 ${fieldErrors.project_id ? 'border-red-500' : ''}`}>
                                        <SelectValue placeholder="Veldu verkefni..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError name="project_id" />
                            </div>

                            {/* Element Type */}
                            <div className="space-y-2">
                                <Label htmlFor="element_type">Tegund (Type) *</Label>
                                <ElementTypeSelect
                                    value={selectedElementType}
                                    onValueChange={setSelectedElementType}
                                    disabled={loading}
                                    className="border-zinc-300 focus:ring-blue-500"
                                />
                            </div>

                            {/* Drawing Reference */}
                            <div className="space-y-2">
                                <Label htmlFor="drawing_reference">Teikning (Drawing Reference)</Label>
                                <Input
                                    id="drawing_reference"
                                    name="drawing_reference"
                                    placeholder="t.d. TEI-001"
                                    defaultValue={initialData?.drawing_reference ?? ''}
                                    disabled={loading}
                                    className="border-zinc-300"
                                />
                            </div>

                            {/* Floor */}
                            <div className="space-y-2">
                                <Label htmlFor="floor">Hæð (Floor)</Label>
                                <Input
                                    id="floor"
                                    name="floor"
                                    type="number"
                                    placeholder="t.d. 3"
                                    defaultValue={initialData?.floor ?? ''}
                                    disabled={loading}
                                    className="border-zinc-300"
                                />
                            </div>

                            {/* Position Description */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="position_description">Staðsetning (Position)</Label>
                                <Input
                                    id="position_description"
                                    name="position_description"
                                    placeholder="t.d. Norðurveggur, íbúð 301"
                                    defaultValue={initialData?.position_description ?? ''}
                                    disabled={loading}
                                    className="border-zinc-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dimensions Section */}
                    <div className="space-y-4 pt-6 border-t border-zinc-200">
                        <h3 className="text-lg font-semibold text-zinc-900">Mál (Dimensions)</h3>
                        <p className="text-sm text-zinc-500">Hámark 50.000 mm (50m) og 100.000 kg</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="length_mm">Lengd (mm)</Label>
                                <Input
                                    id="length_mm"
                                    name="length_mm"
                                    type="number"
                                    min="1"
                                    max="50000"
                                    placeholder="6000"
                                    defaultValue={initialData?.length_mm ?? ''}
                                    disabled={loading}
                                    onBlur={(e) => validateField('length_mm', parseNumberInput(e.target.value))}
                                    className={`border-zinc-300 ${fieldErrors.length_mm ? 'border-red-500' : ''}`}
                                />
                                <FieldError name="length_mm" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="width_mm">Breidd (mm)</Label>
                                <Input
                                    id="width_mm"
                                    name="width_mm"
                                    type="number"
                                    min="1"
                                    max="50000"
                                    placeholder="1200"
                                    defaultValue={initialData?.width_mm ?? ''}
                                    disabled={loading}
                                    onBlur={(e) => validateField('width_mm', parseNumberInput(e.target.value))}
                                    className={`border-zinc-300 ${fieldErrors.width_mm ? 'border-red-500' : ''}`}
                                />
                                <FieldError name="width_mm" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height_mm">Hæð (mm)</Label>
                                <Input
                                    id="height_mm"
                                    name="height_mm"
                                    type="number"
                                    min="1"
                                    max="50000"
                                    placeholder="200"
                                    defaultValue={initialData?.height_mm ?? ''}
                                    disabled={loading}
                                    onBlur={(e) => validateField('height_mm', parseNumberInput(e.target.value))}
                                    className={`border-zinc-300 ${fieldErrors.height_mm ? 'border-red-500' : ''}`}
                                />
                                <FieldError name="height_mm" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight_kg">Þyngd (kg)</Label>
                                <Input
                                    id="weight_kg"
                                    name="weight_kg"
                                    type="number"
                                    step="0.01"
                                    min="0.1"
                                    max="100000"
                                    placeholder="2500"
                                    defaultValue={initialData?.weight_kg ?? ''}
                                    disabled={loading}
                                    onBlur={(e) => validateField('weight_kg', parseNumberInput(e.target.value))}
                                    className={`border-zinc-300 ${fieldErrors.weight_kg ? 'border-red-500' : ''}`}
                                />
                                <FieldError name="weight_kg" />
                            </div>
                        </div>
                    </div>

                    {/* Production Section */}
                    <div className="space-y-4 pt-6 border-t border-zinc-200">
                        <h3 className="text-lg font-semibold text-zinc-900">Framleiðsla (Production)</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Status */}
                            <div className="space-y-2">
                                <Label htmlFor="status">Staða (Status) *</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={loading}>
                                    <SelectTrigger className="border-zinc-300 focus:ring-blue-500">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planned">Skipulagt (Planned)</SelectItem>
                                        <SelectItem value="rebar">Járnabundið (Rebar)</SelectItem>
                                        <SelectItem value="cast">Steypt (Cast)</SelectItem>
                                        <SelectItem value="curing">Þornar (Curing)</SelectItem>
                                        <SelectItem value="ready">Tilbúið (Ready)</SelectItem>
                                        <SelectItem value="loaded">Á bíl (Loaded)</SelectItem>
                                        <SelectItem value="delivered">Afhent (Delivered)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <Label htmlFor="priority">Forgangur (Priority)</Label>
                                <Input
                                    id="priority"
                                    name="priority"
                                    type="number"
                                    min="0"
                                    max="999"
                                    placeholder="0"
                                    defaultValue={initialData?.priority ?? 0}
                                    disabled={loading}
                                    onBlur={(e) => validateField('priority', parseNumberInput(e.target.value))}
                                    className={`border-zinc-300 ${fieldErrors.priority ? 'border-red-500' : ''}`}
                                />
                                <p className="text-xs text-zinc-500">Hærri tala = meiri forgangur (0-999)</p>
                                <FieldError name="priority" />
                            </div>

                            {/* Production Notes */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="production_notes">Framleiðsluathugasemdir (Production Notes)</Label>
                                <Textarea
                                    id="production_notes"
                                    name="production_notes"
                                    rows={3}
                                    maxLength={2000}
                                    placeholder="Athugasemdir um framleiðslu..."
                                    defaultValue={initialData?.production_notes ?? ''}
                                    disabled={loading}
                                    className="border-zinc-300"
                                />
                                <p className="text-xs text-zinc-500">Hámark 2.000 stafir</p>
                            </div>

                            {/* Delivery Notes */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="delivery_notes">Afhendingarathugasemdir (Delivery Notes)</Label>
                                <Textarea
                                    id="delivery_notes"
                                    name="delivery_notes"
                                    rows={3}
                                    maxLength={2000}
                                    placeholder="Athugasemdir um afhendingu..."
                                    defaultValue={initialData?.delivery_notes ?? ''}
                                    disabled={loading}
                                    className="border-zinc-300"
                                />
                            </div>
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

            <CardFooter className="border-t border-zinc-100 bg-zinc-50/50 p-6 flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                >
                    Hætta við (Cancel)
                </Button>
                <Button type="submit" form="element-form" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditing ? 'Vista...' : 'Stofna...'}
                        </>
                    ) : (
                        isEditing ? 'Vista breytingar' : 'Stofna einingu'
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
