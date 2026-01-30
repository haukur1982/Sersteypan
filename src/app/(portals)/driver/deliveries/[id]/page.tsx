import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getDriverDeliveryDetail } from '@/lib/driver/queries'
import { DriverDeliveryDetail } from '@/components/driver/DriverDeliveryDetail'

interface DeliveryPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
    const { id } = await params
    const user = await getUser()

    if (!user || user.role !== 'driver') {
        redirect('/login')
    }

    const delivery = await getDriverDeliveryDetail(id)

    if (!delivery) {
        return notFound()
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <DriverDeliveryDetail delivery={delivery} />
            </div>
        </DashboardLayout>
    )
}
