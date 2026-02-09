const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnvFile(fileName) {
  const envPath = path.resolve(__dirname, `../${fileName}`)
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const clean = line.trim()
    if (!clean || clean.startsWith('#')) continue

    const idx = clean.indexOf('=')
    if (idx <= 0) continue

    const key = clean.substring(0, idx).trim()
    let value = clean.substring(idx + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OWNER_PASSWORD = process.env.OWNER_PORTAL_PASSWORD || 'OwnerAccess!2026'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OWNER_USERS = [
  {
    email: 'owner.admin@sersteypan.test',
    full_name: 'Owner Admin',
    role: 'admin',
    phone: '555-8101',
    needsCompany: false,
  },
  {
    email: 'owner.factory@sersteypan.test',
    full_name: 'Owner Factory',
    role: 'factory_manager',
    phone: '555-8102',
    needsCompany: false,
  },
  {
    email: 'owner.buyer@sersteypan.test',
    full_name: 'Owner Buyer',
    role: 'buyer',
    phone: '555-8103',
    needsCompany: true,
  },
  {
    email: 'owner.driver@sersteypan.test',
    full_name: 'Owner Driver',
    role: 'driver',
    phone: '555-8104',
    needsCompany: false,
  },
]

async function ensureBuyerCompany() {
  const companyName = 'Owner Feedback Company'
  const { data: existing, error: lookupError } = await supabase
    .from('companies')
    .select('id')
    .eq('name', companyName)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Failed to lookup buyer company: ${lookupError.message}`)
  }

  if (existing?.id) return existing.id

  const { data: inserted, error: insertError } = await supabase
    .from('companies')
    .insert({
      name: companyName,
      kennitala: `owner-${Date.now()}`.slice(0, 10),
      contact_email: 'owner.feedback@sersteypan.test',
      contact_phone: '555-8199',
      address: 'Owner Feedback Street 1',
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    throw new Error(`Failed to create buyer company: ${insertError?.message || 'Unknown error'}`)
  }

  return inserted.id
}

async function getAllUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (error) throw new Error(`Failed to list users: ${error.message}`)
  return data.users || []
}

async function createOrUpdateOwnerUsers() {
  const buyerCompanyId = await ensureBuyerCompany()
  const existingUsers = await getAllUsers()

  for (const userSpec of OWNER_USERS) {
    const existing = existingUsers.find((u) => u.email === userSpec.email)
    let userId = existing?.id

    if (userId) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: OWNER_PASSWORD,
        user_metadata: { full_name: userSpec.full_name },
      })

      if (updateError) {
        throw new Error(`Failed to update auth user ${userSpec.email}: ${updateError.message}`)
      }
      console.log(`Updated auth user: ${userSpec.email}`)
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: userSpec.email,
        password: OWNER_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: userSpec.full_name },
      })

      if (createError || !created?.user?.id) {
        throw new Error(`Failed to create auth user ${userSpec.email}: ${createError?.message || 'Unknown error'}`)
      }

      userId = created.user.id
      console.log(`Created auth user: ${userSpec.email}`)
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: userSpec.email,
      full_name: userSpec.full_name,
      role: userSpec.role,
      phone: userSpec.phone,
      company_id: userSpec.needsCompany ? buyerCompanyId : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      throw new Error(`Failed to upsert profile ${userSpec.email}: ${profileError.message}`)
    }

    console.log(`Synced profile: ${userSpec.email} (${userSpec.role})`)
  }

  console.log('\nOwner credentials are ready:')
  console.log(`Password for all owner users: ${OWNER_PASSWORD}`)
  for (const userSpec of OWNER_USERS) {
    console.log(`- ${userSpec.role}: ${userSpec.email}`)
  }
}

createOrUpdateOwnerUsers()
  .then(() => {
    console.log('\nDone.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nFailed:', error.message)
    process.exit(1)
  })
