
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Basic env loader
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local')
        console.log(`Checking env file at: ${envPath}`)
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8')
            const lines = envConfig.split('\n')
            console.log(`Found ${lines.length} lines in .env.local`)

            lines.forEach(line => {
                const trimmed = line.trim()
                if (!trimmed || trimmed.startsWith('#')) return

                const eqIdx = trimmed.indexOf('=')
                if (eqIdx > 0) {
                    const key = trimmed.substring(0, eqIdx).trim()
                    let val = trimmed.substring(eqIdx + 1).trim()

                    // Remove quotes if they exist around the value
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1)
                    }

                    if (!process.env[key]) {
                        process.env[key] = val
                    }
                }
            })
            console.log('✅ Loaded .env.local')
        } else {
            console.log('⚠️ .env.local not found')
        }
    } catch (e) {
        console.warn('⚠️ Could not load .env.local', e)
    }
}

loadEnv()

// Debug: Print available keys (masked)
const keysToCheck = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
console.log('Environment Check:')
keysToCheck.forEach(k => {
    const val = process.env[k]
    console.log(`  ${k}: ${val ? (val.substring(0, 5) + '...') : 'MISSING'}`)
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const TEST_PASSWORD = 'Password123!'

const USERS = [
    {
        email: 'admin@sersteypan.test',
        password: TEST_PASSWORD,
        role: 'admin',
        full_name: 'Admin User',
        phone: '555-0001'
    },
    {
        email: 'factory@sersteypan.test',
        password: TEST_PASSWORD,
        role: 'factory_manager',
        full_name: 'Factory Manager',
        phone: '555-0002'
    },
    {
        email: 'driver@sersteypan.test',
        password: TEST_PASSWORD,
        role: 'driver',
        full_name: 'Driver User',
        phone: '555-0004'
    },
    {
        email: 'buyer@sersteypan.test',
        password: TEST_PASSWORD,
        role: 'buyer',
        full_name: 'Buyer User',
        phone: '555-0003',
        needsCompany: true
    }
]

async function seed() {
    console.log('🌱 Seeding test users...')

    // 1. Ensure Test Company for Buyer
    let companyId: string | null = null

    const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('name', 'Test Company')
        .single()

    if (companies) {
        companyId = companies.id
    } else {
        console.log('Creating Test Company...')
        const { data: newCompany, error } = await supabase
            .from('companies')
            .insert({
                name: 'Test Company',
                kennitala: '0000000000',
                contact_email: 'test@company.test',
                contact_phone: '555-9999',
                address: 'Test Street 1',
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('❌ Failed to create company:', error)
        } else {
            companyId = newCompany.id
        }
    }

    if (!companyId) {
        console.log('⚠️ Could not find or create Test Company. Buyer assignment might fail.')
    }

    // 2. Create Users
    for (const u of USERS) {
        console.log(`Processing ${u.email}...`)

        // Check if exists
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existingUser = users.find((user: any) => user.email === u.email)

        let userId = existingUser?.id

        if (!userId) {
            // Create Auth User
            const { data, error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: {
                    full_name: u.full_name
                }
            })

            if (error) {
                console.error(`  ❌ Failed to create auth user ${u.email}:`, error.message)
                continue
            }
            userId = data.user.id
            console.log(`  ✅ Created auth user: ${userId}`)
        } else {
            console.log(`  ℹ️ Auth user already exists: ${userId}`)
            // Optional: Update password if needed
        }

        // Upsert Profile
        const profileData: any = {
            id: userId,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            phone: u.phone,
            is_active: true
        }

        if (u.needsCompany && companyId) {
            profileData.company_id = companyId
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData)

        if (profileError) {
            console.error(`  ❌ Failed to update profile for ${u.email}:`, profileError.message)
        } else {
            console.log(`  ✅ Profile synced for ${u.email}`)
        }
    }

    console.log('✨ Seeding complete.')
}

seed().catch(console.error)
