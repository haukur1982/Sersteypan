'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface FloorPlanUploadFormProps {
    projectId: string
}

export function FloorPlanUploadForm({ projectId }: FloorPlanUploadFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [floorNumber, setFloorNumber] = useState('1')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (!selectedFile.type.startsWith('image/')) {
            setError('Vinsamlegast veldu mynd (PNG, JPG, etc.)')
            return
        }

        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('Mynd má ekki vera stærri en 20MB')
            return
        }

        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
        setError(null)
    }

    const removeFile = () => {
        setFile(null)
        if (preview) {
            URL.revokeObjectURL(preview)
            setPreview(null)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('Nafn er nauðsynlegt')
            return
        }

        if (!file) {
            setError('Vinsamlegast veldu mynd')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            // Upload image to storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${projectId}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('floor-plans')
                .upload(fileName, file)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                setError('Gat ekki hlaðið upp mynd')
                setIsSubmitting(false)
                return
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('floor-plans')
                .getPublicUrl(fileName)

            // Create floor plan record
            const { error: insertError } = await supabase
                .from('floor_plans')
                .insert({
                    project_id: projectId,
                    name: name.trim(),
                    floor: parseInt(floorNumber) || 1,
                    plan_image_url: urlData.publicUrl,
                })

            if (insertError) {
                console.error('Insert error:', insertError)
                setError('Gat ekki vistað hæðarteikningu')
                setIsSubmitting(false)
                return
            }

            // Success - navigate back to project
            router.push(`/admin/projects/${projectId}`)
            router.refresh()
        } catch (err) {
            console.error('Submit error:', err)
            setError('Óvænt villa kom upp')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <Card className="p-6">
                <Label className="mb-4 block">Grunnmynd *</Label>

                {preview ? (
                    <div className="relative">
                        <Image
                            src={preview}
                            alt="Floor plan preview"
                            width={600}
                            height={400}
                            className="rounded-lg object-contain w-full max-h-[400px] bg-muted"
                        />
                        <button
                            type="button"
                            onClick={removeFile}
                            className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                        <span className="text-muted-foreground mt-2">Smelltu til að velja mynd</span>
                        <span className="text-xs text-muted-foreground mt-1">PNG, JPG, upp að 20MB</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                )}
            </Card>

            {/* Floor Plan Details */}
            <Card className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nafn *</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="t.d. 1. hæð, Kjallari"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="floorNumber">Hæðarnúmer</Label>
                    <Input
                        id="floorNumber"
                        type="number"
                        value={floorNumber}
                        onChange={(e) => setFloorNumber(e.target.value)}
                        min={-5}
                        max={100}
                    />
                    <p className="text-xs text-muted-foreground">-1 = kjallari, 0 = jarðhæð, 1+ = hæðir</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Lýsing (valfrjálst)</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Athugasemdir um þessa hæðarteikningu..."
                        rows={3}
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
                disabled={isSubmitting || !file}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Vista hæðarteikningu...
                    </>
                ) : (
                    <>
                        <Upload className="w-5 h-5 mr-2" />
                        Vista hæðarteikningu
                    </>
                )}
            </Button>
        </form>
    )
}
