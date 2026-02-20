import { createClient } from '@/lib/supabase/server'
import { LaborRegistrationClient } from './LaborRegistrationClient'

export default async function LaborRegistrationPage() {
    const supabase = await createClient()

    // 1. Fetch available elements. 
    // Usually you want to log rebar for elements in 'planned' or 'rebar' status.
    const { data: elements } = await supabase
        .from('elements')
        .select(`
            id,
            name,
            element_type,
            status,
            projects!inner(id, name)
        `)
        .in('status', ['planned', 'rebar', 'cast']) // allow slightly after the fact logging
        .order('name')

    // 2. Fetch available workers (all users with factory related roles for now)
    const { data: workers } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .is('is_active', true)
        .order('full_name')

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Vinnuskráning (Labor Logs)
                </h1>
                <p className="text-muted-foreground mt-1">
                    Skráðu vinnu (t.d. járnabindingu) á einingar og tengdu við starfsmenn til að sjá afköst.
                </p>
            </div>

            <LaborRegistrationClient
                elements={elements || []}
                workers={workers || []}
            />
        </div>
    )
}
