import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugMessageInsert() {
    const email = 'buyer@sersteypan.test'
    const password = 'Password123!'
    const projectId = '6ef12ad6-3f15-480c-8fe6-00819e9f7051'

    console.log(`Authenticating as ${email}...`)
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (authError) {
        console.error('Auth error:', authError)
        return
    }

    const user = session?.user
    console.log('User authenticated:', user?.id)

    // Check profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user?.id)
        .single()

    if (profileError) {
        console.error('Profile error:', profileError)
    } else {
        console.log('Profile:', profile)
    }

    // Check project
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, company_id')
        .eq('id', projectId)
        .single()

    if (projectError) {
        console.error('Project error:', projectError)
    } else {
        console.log('Project:', project)
    }

    // Attempt insert
    console.log('Attempting to insert message...')
    const { data, error: insertError } = await supabase
        .from('project_messages')
        .insert({
            project_id: projectId,
            user_id: user?.id,
            message: 'Debug message from script'
        })
        .select()

    if (insertError) {
        console.error('Insert error:', insertError)
    } else {
        console.log('Success! Inserted message:', data)
    }
}

debugMessageInsert()
