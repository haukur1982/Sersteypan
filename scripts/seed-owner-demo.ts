import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role to create auth users

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const testUsers = [
    { email: 'owner.factory@sersteypan.test', role: 'factory_manager', name: 'Factory Owner' },
    { email: 'owner.admin@sersteypan.test', role: 'admin', name: 'Admin Owner' },
    { email: 'owner.buyer@sersteypan.test', role: 'buyer', name: 'Buyer Owner' },
    { email: 'owner.driver@sersteypan.test', role: 'driver', name: 'Driver Owner' },
]

const PASSWORD = 'OwnerAccess!2026'

async function setupDemoUsers() {
    console.log('🏁 Starting Owner Demo Setup...')

    for (const t of testUsers) {
        console.log(`\n👤 Setting up ${t.email}...`)

        // 1. Check if user exists in auth.users
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

        if (listError) {
            console.error('Error listing users:', listError)
            continue
        }

        let authUserId = users.find((u: any) => u.email === t.email)?.id

        if (authUserId) {
            console.log(`   User already exists in auth.users (ID: ${authUserId}). Updating password...`)
            await supabase.auth.admin.updateUserById(authUserId, { password: PASSWORD })
        } else {
            console.log('   Creating new user in auth.users...')
            const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
                email: t.email,
                password: PASSWORD,
                email_confirm: true
            })
            if (createError) {
                console.error('   ❌ Error creating user:', createError)
                continue
            }
            authUserId = newAuthUser.user.id
            console.log(`   ✅ Created successfully (ID: ${authUserId})`)
        }

        // 2. Ensure profile exists and has correct role
        const { error: profileUpsertError } = await supabase
            .from('profiles')
            .upsert({
                id: authUserId,
                email: t.email,
                full_name: t.name,
                role: t.role,
                preferences: {}
            }, { onConflict: 'id' })

        if (profileUpsertError) {
            console.error('   ❌ Error upserting profile:', profileUpsertError)
        } else {
            console.log(`   ✅ Profile synced with role: ${t.role}`)
        }
    }

    // 3. Ensure we have at least one active project with some planned elements to test with
    console.log('\n🏗️ Ensuring demo project and elements exist...')

    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single()

    if (project) {
        console.log(`   ✅ Found active project to test with (ID: ${project.id})`)

        // Check if we need to mock some elements
        const { count } = await supabase
            .from('elements')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id)

        if (count === 0) {
            await supabase.from('elements').insert([
                { project_id: project.id, name: 'DEMO-WALL-01', element_type: 'wall', status: 'planned', unit_number: '1' },
                { project_id: project.id, name: 'DEMO-WALL-02', element_type: 'wall', status: 'planned', unit_number: '1' },
                { project_id: project.id, name: 'DEMO-SLAB-01', element_type: 'filigran', status: 'planned', unit_number: '2' },
            ])
            console.log(`   ✅ Created some demo elements for testing`)
        } else {
            console.log(`   ✅ Project already has ${count} elements for testing`)
        }

    } else {
        console.log('   ⚠️ No active projects found. You may need to create one first inside the Admin dashboard.')
    }

    console.log('\n🎉 Setup complete! You can now log into https://factory.sersteypan.is (or localhost:3000) using the provided credentials.')
}

setupDemoUsers().catch(console.error)
