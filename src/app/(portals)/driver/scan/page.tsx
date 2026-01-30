import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ScanPageClient } from './ScanPageClient'

export const metadata = {
    title: 'Skanna QR | Sérsteypan',
    description: 'Skannaðu QR kóða á steypueiningum',
}

export default async function ScanPage() {
    const user = await getUser()

    if (!user || user.role !== 'driver') {
        redirect('/login')
    }

    return (
        <DashboardLayout>
            <div className="max-w-lg mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">
                        Skanna QR kóða
                    </h1>
                    <p className="text-zinc-600 mt-1">
                        Beindu myndavélinni að QR kóða á einingu
                    </p>
                </div>

                <ScanPageClient />
            </div>
        </DashboardLayout>
    )
}
