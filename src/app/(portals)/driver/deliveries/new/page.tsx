import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { NewDeliveryForm } from './NewDeliveryForm'

export const metadata = {
    title: 'Ný afhending | Sérsteypan',
    description: 'Búa til nýja afhendingu',
}

export default async function NewDeliveryPage() {
    const user = await getUser()

    if (!user || user.role !== 'driver') {
        redirect('/login')
    }

    const supabase = await createClient()

    // Fetch active projects for dropdown
    const { data: projects } = await supabase
        .from('projects')
        .select('id, name, address, company:companies(name)')
        .eq('status', 'active')
        .order('name', { ascending: true })

    const projectList = projects || []

    return (
        <DashboardLayout>
            <div className="max-w-lg mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Ný afhending</h1>
                    <p className="text-muted-foreground mt-1">
                        Búðu til nýja afhendingu og bættu einingum við með QR skanna
                    </p>
                </div>

                <NewDeliveryForm projects={projectList} />
            </div>
        </DashboardLayout>
    )
}
