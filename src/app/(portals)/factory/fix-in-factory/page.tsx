import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getFixRequests } from '@/lib/factory/fix-factory-actions'
import { FixInFactoryList } from '@/components/factory/FixInFactoryList'
import { redirect } from 'next/navigation'

export default async function FixInFactoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const requests = await getFixRequests()

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fix in Factory</h1>
                    <p className="text-muted-foreground">Track items that need repair or rework</p>
                </div>

                <FixInFactoryList requests={requests} />
            </div>
        </DashboardLayout>
    )
}
