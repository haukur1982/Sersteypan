import { getFixRequests } from '@/lib/factory/fix-factory-actions'
import { FixInFactoryList } from '@/components/factory/FixInFactoryList'

export default async function FixInFactoryPage() {
    const requests = await getFixRequests()

    return (
        <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fix in Factory</h1>
                    <p className="text-muted-foreground">Track items that need repair or rework</p>
                </div>

                <FixInFactoryList requests={requests} />
        </div>
    )
}
