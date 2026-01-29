#!/usr/bin/env node

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rggqjcguhfcfhlwbyrug.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')

// Supabase direct connection string format
const connectionString = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`

// Note: The service role key is a JWT, not the database password
// We need to use the database password from Supabase settings
console.warn('⚠️  Note: Cannot connect with service role JWT. Need database password from Settings > Database.')
console.warn('    Alternative: Use Supabase SQL Editor to run migrations manually.')
console.warn('')

async function runMigration(filename) {
  console.log(`\n📝 Applying migration: ${filename}`)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('   ✅ Connected to database')

    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', filename)
    const sql = readFileSync(migrationPath, 'utf8')

    console.log(`   📄 Executing SQL (${sql.length} characters)...`)

    await client.query(sql)

    console.log(`   ✅ Migration ${filename} completed successfully`)

    await client.end()
    return true

  } catch (error) {
    console.error(`   ❌ Failed to execute migration: ${error.message}`)
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`)
    }
    await client.end()
    return false
  }
}

async function main() {
  console.log('🚀 Starting migration process...\n')
  console.log(`📍 Target: ${SUPABASE_URL}`)
  console.log(`📍 Project: ${projectRef}\n`)

  const migrations = [
    '002_add_missing_tables.sql',
    '003_add_performance_indexes.sql'
  ]

  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (!success) {
      console.error(`\n❌ Migration failed: ${migration}`)
      console.error('Stopping migration process.')
      process.exit(1)
    }
  }

  console.log('\n✅ All migrations completed successfully!')
  console.log('\n📊 Next steps:')
  console.log('   1. Regenerate TypeScript types')
  console.log('   2. Run seed script')
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
