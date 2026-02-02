
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function setupBuckets() {
    console.log('--- Setting up Storage Buckets ---')

    const buckets = [
        {
            id: 'qr-codes',
            public: true,
            fileSizeLimit: 1048576, // 1MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml']
        },
        {
            id: 'reports',
            public: false,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['application/pdf']
        },
        {
            id: 'delivery-photos',
            public: false,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
        },
        {
            id: 'documents',
            public: false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        }
    ]

    for (const bucket of buckets) {
        console.log(`Checking bucket: ${bucket.id}`)

        // Check if bucket exists
        const { data: existing, error: getError } = await supabase.storage.getBucket(bucket.id)

        if (existing) {
            console.log(`✅ Bucket ${bucket.id} already exists.`)
            // Update config if needed
            const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
                public: bucket.public,
                fileSizeLimit: bucket.fileSizeLimit,
                allowedMimeTypes: bucket.allowedMimeTypes
            })
            if (updateError) console.error(`Failed to update ${bucket.id}:`, updateError)
        } else {
            console.log(`Creating bucket ${bucket.id}...`)
            const { data, error } = await supabase.storage.createBucket(bucket.id, {
                public: bucket.public,
                fileSizeLimit: bucket.fileSizeLimit,
                allowedMimeTypes: bucket.allowedMimeTypes
            })

            if (error) {
                console.error(`❌ Error creating ${bucket.id}:`, error)
            } else {
                console.log(`✅ Created bucket ${bucket.id}`)
            }
        }
    }
}

setupBuckets()
