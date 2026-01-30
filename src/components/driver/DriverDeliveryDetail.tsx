'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Box, CheckCircle, Truck, ArrowLeft, Loader2, Camera } from 'lucide-react'
import Link from 'next/link'
import { updateDeliveryStatus, updateDeliveryPhoto } from '@/lib/driver/actions'
import { createClient } from '@/lib/supabase/client'

interface DriverDeliveryDetailProps {
    delivery: any
}

const statusConfig: Record<string, { label: string; color: string; nextStatus: string | null; nextLabel: string }> = {
    planned: { label: 'Skipulagt', color: 'bg-zinc-100 text-zinc-800', nextStatus: 'loading', nextLabel: 'Byrja hleðslu' },
    loading: { label: 'Í hleðslu', color: 'bg-amber-100 text-amber-800', nextStatus: 'in_transit', nextLabel: 'Byrja akstur' },
    in_transit: { label: 'Á leiðinni', color: 'bg-blue-100 text-blue-800', nextStatus: 'arrived', nextLabel: 'Mættur á staðinn' },
    arrived: { label: 'Kominn á staðinn', color: 'bg-indigo-100 text-indigo-800', nextStatus: 'completed', nextLabel: 'Ljúka afhendingu' },
    completed: { label: 'Afhent', color: 'bg-green-100 text-green-800', nextStatus: null, nextLabel: '' }
}

export function DriverDeliveryDetail({ delivery }: DriverDeliveryDetailProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isUploading, setIsUploading] = useState(false)
    const currentStatusInfo = statusConfig[delivery.status] || statusConfig.planned

    const handleStatusUpdate = () => {
        if (!currentStatusInfo.nextStatus) return

        startTransition(async () => {
            await updateDeliveryStatus(delivery.id, currentStatusInfo.nextStatus as any)
            router.refresh()
        })
    }

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const supabase = createClient()

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const timestamp = Date.now()
            const ext = file.name.split('.').pop()
            const filePath = `${user.id}/${delivery.id}/${timestamp}_delivery.${ext}`

            const { error: uploadError } = await supabase.storage
                .from('delivery-photos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('delivery-photos')
                .getPublicUrl(filePath)

            await updateDeliveryPhoto(delivery.id, publicUrl)
            router.refresh()
        } catch (err) {
            console.error('Photo upload failed:', err)
            alert('Tókst ekki að hlaða upp mynd')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/driver">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Afhending {delivery.truck_registration}</h1>
                    <Badge variant="secondary" className={`${currentStatusInfo.color} mt-1`}>
                        {currentStatusInfo.label}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-zinc-400" />
                                Afhendingarstaður
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <h3 className="font-bold text-zinc-900 text-lg">{delivery.project?.name}</h3>
                            <p className="text-zinc-600 mt-1">{delivery.project?.address}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Box className="w-5 h-5 text-zinc-400" />
                                Innihald ({delivery.items?.length || 0} einingar)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-zinc-100">
                                {delivery.items?.map((item: any) => (
                                    <div key={item.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-zinc-900">{item.element?.name}</p>
                                            <p className="text-xs text-zinc-500">{item.element?.element_type}</p>
                                        </div>
                                        <div className="text-xs font-mono text-zinc-400">
                                            Staða {item.load_position || '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-zinc-200 bg-zinc-50">
                        <CardHeader>
                            <CardTitle className="text-lg">Aðgerðir</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {currentStatusInfo.nextStatus && (
                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={handleStatusUpdate}
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : currentStatusInfo.nextLabel}
                                </Button>
                            )}

                            {delivery.status === 'arrived' || delivery.status === 'completed' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="delivery-photo"
                                            className="hidden"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handlePhotoUpload}
                                            disabled={isUploading}
                                        />
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 border-dashed border-zinc-300 hover:bg-zinc-100"
                                            asChild
                                        >
                                            <label htmlFor="delivery-photo">
                                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5 mr-2" /> Taka mynd</>}
                                            </label>
                                        </Button>
                                    </div>

                                    {delivery.delivery_photo_url && (
                                        <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-200 bg-white">
                                            <img
                                                src={delivery.delivery_photo_url}
                                                alt="Delivery documentation"
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {delivery.status === 'completed' && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center flex flex-col items-center">
                                    <CheckCircle className="w-8 h-8 mb-2" />
                                    <p className="font-bold">Afhendingu lokið!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
