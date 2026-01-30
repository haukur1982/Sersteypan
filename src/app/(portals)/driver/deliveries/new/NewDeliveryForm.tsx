'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Truck, MapPin, Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createDelivery } from '@/lib/driver/delivery-actions'

interface Project {
    id: string
    name: string
    address: string | null
    company: { name: string } | null
}

interface NewDeliveryFormProps {
    projects: Project[]
}

export function NewDeliveryForm({ projects }: NewDeliveryFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')

    const selectedProject = projects.find(p => p.id === selectedProjectId)

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        setError(null)

        // Add project ID from state (since Select doesn't work with native form)
        formData.set('projectId', selectedProjectId)

        const result = await createDelivery(formData)

        if (result.error) {
            setError(result.error)
            setIsSubmitting(false)
            return
        }

        if (result.deliveryId) {
            // Navigate to scan page to add elements
            router.push(`/driver/load?delivery=${result.deliveryId}`)
        } else {
            setIsSubmitting(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            {/* Back Link */}
            <Link
                href="/driver/deliveries"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Til baka
            </Link>

            {/* Project Selection */}
            <Card className="p-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="project">Verkefni *</Label>
                    <Select
                        value={selectedProjectId}
                        onValueChange={setSelectedProjectId}
                    >
                        <SelectTrigger id="project" className="w-full">
                            <SelectValue placeholder="Veldu verkefni..." />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.length === 0 ? (
                                <SelectItem value="none" disabled>
                                    Engin virk verkefni
                                </SelectItem>
                            ) : (
                                projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        <div className="flex flex-col">
                                            <span>{project.name}</span>
                                            {project.company && (
                                                <span className="text-xs text-muted-foreground">
                                                    {project.company.name}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Selected Project Info */}
                {selectedProject && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-foreground">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{selectedProject.company?.name || 'Óþekkt fyrirtæki'}</span>
                        </div>
                        {selectedProject.address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>{selectedProject.address}</span>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Truck Info */}
            <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-medium text-foreground">Bílupplýsingar</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="truckRegistration">Bílnúmer *</Label>
                    <Input
                        id="truckRegistration"
                        name="truckRegistration"
                        placeholder="AB-123"
                        className="uppercase"
                        maxLength={20}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="truckDescription">Lýsing (valfrjálst)</Label>
                    <Input
                        id="truckDescription"
                        name="truckDescription"
                        placeholder="t.d. Hvítur Volvo"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="plannedDate">Áætluð dagsetning</Label>
                    <Input
                        id="plannedDate"
                        name="plannedDate"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                    />
                </div>
            </Card>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !selectedProjectId}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Bý til afhendingu...
                    </>
                ) : (
                    <>
                        <Truck className="w-5 h-5 mr-2" />
                        Búa til afhendingu
                    </>
                )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
                Eftir að afhending er búin til geturðu skannað einingar til að bæta þeim við
            </p>
        </form>
    )
}
