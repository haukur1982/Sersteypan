import { notFound } from 'next/navigation'
import { getDriverDeliveryDetail } from '@/lib/driver/queries'
import { DriverDeliveryDetail } from '@/components/driver/DriverDeliveryDetail'

interface DeliveryPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
    const { id } = await params
    const delivery = await getDriverDeliveryDetail(id)

    if (!delivery) {
        return notFound()
    }

    return (
        <div className="max-w-5xl mx-auto">
            <DriverDeliveryDetail delivery={delivery} />
        </div>
    )
}
