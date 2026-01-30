
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        // Trim and ignore comments
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('#')) return;

        // Split by first =
        const idx = cleanLine.indexOf('=');
        if (idx !== -1) {
            const key = cleanLine.substring(0, idx).trim();
            let value = cleanLine.substring(idx + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            process.env[key] = value;
        }
    });
} else {
    console.error('Env file not found at:', envPath);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Found URL:', supabaseUrl ? 'Yes' : 'No');
console.log('Found Service Key:', supabaseServiceKey ? 'Yes' : 'No');

if (!supabaseUrl || !supabaseServiceKey) {
    // Try reading standard .env if .env.local fails
    const envPath2 = path.resolve(__dirname, '../.env');
    console.log('Trying fallback env:', envPath2);
    // ... similar logic omitted for brevity, just error out for now
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const users = [
    { email: 'buyer-a@test.is', password: 'TestPass123!', role: 'buyer', company_id: '11111111-1111-1111-1111-111111111111', name: 'Buyer A Test' },
    { email: 'buyer-b@test.is', password: 'TestPass123!', role: 'buyer', company_id: '22222222-2222-2222-2222-222222222222', name: 'Buyer B Test' },
    { email: 'factory@test.is', password: 'TestPass123!', role: 'factory_manager', company_id: null, name: 'Factory Test' },
    { email: 'admin@test.is', password: 'TestPass123!', role: 'admin', company_id: null, name: 'Admin Test' },
    { email: 'driver@test.is', password: 'TestPass123!', role: 'driver', company_id: null, name: 'Driver Test' }
];

async function setup() {
    for (const u of users) {
        console.log(`Setting up ${u.email}...`);

        // Check if user exists
        const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();

        let userId;
        const existing = existingUsers?.find(eu => eu.email === u.email);

        if (existing) {
            console.log(`User ${u.email} exists, updating password...`);
            const { data, error } = await supabase.auth.admin.updateUserById(existing.id, { password: u.password });
            if (error) console.error('Update password error:', error.message);
            userId = existing.id;
        } else {
            console.log(`Creating user ${u.email}...`);
            const { data, error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true
            });
            if (error) {
                console.error('Create user error:', error.message);
                continue;
            }
            userId = data.user.id;
        }

        if (userId) {
            // Upsert profile
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: userId,
                email: u.email,
                full_name: u.name,
                role: u.role,
                company_id: u.company_id,
                is_active: true
            });

            if (profileError) console.error('Profile update error:', profileError.message);
            else console.log(`Profile for ${u.email} updated.`);
        }
    }
}

setup();
