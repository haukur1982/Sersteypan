import { getStockItems } from '@/lib/stock/queries'
import { StockList } from '@/components/factory/StockList'

export default async function FactoryStockPage() {
    const stockItems = await getStockItems()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900">Lagerstjórnun</h1>
                <p className="text-zinc-600 mt-1">Yfirlit yfir lagerstöðu og hreyfingar.</p>
            </div>

            <StockList items={stockItems} />
        </div>
    )
}
