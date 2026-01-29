#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rggqjcguhfcfhlwbyrug.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verify() {
  const tables = [
    'companies', 'profiles', 'projects', 'elements',
    'deliveries', 'priority_requests', 'legacy_id_mapping'
  ]

  console.log('📊 Database Verification\n')

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`)
    } else {
      console.log(`✅ ${table}: ${count} rows`)
    }
  }
}

verify()
