import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getStockItems } from '@/lib/stock/queries'
import { StockList } from '@/components/factory/StockList'
import { redirect } from 'next/navigation'

export default async function FactoryStockPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const stockItems = await getStockItems()

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Lagerstjórnun</h1>
                    <p className="text-zinc-600 mt-1">Yfirlit yfir lagerstöðu og hreyfingar.</p>
                </div>

                <StockList items={stockItems} />
            </div>
        </DashboardLayout>
    )
}
