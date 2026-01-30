
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('#')) return;
        const idx = cleanLine.indexOf('=');
        if (idx !== -1) {
            const key = cleanLine.substring(0, idx).trim();
            let value = cleanLine.substring(idx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBuyerB() {
    const email = 'buyer-b@test.is';
    const password = 'TestPass123!';
    const companyId = '22222222-2222-2222-2222-222222222222'; // Company B

    // Create/Update Auth User
    const { data: users } = await supabase.auth.admin.listUsers();
    let userId = users.users.find(u => u.email === email)?.id;

    if (userId) {
        console.log('Updating existing Buyer B...');
        await supabase.auth.admin.updateUserById(userId, { password });
    } else {
        console.log('Creating Buyer B...');
        const { data, error } = await supabase.auth.admin.createUser({
            email, password, email_confirm: true
        });
        if (error) { console.error(error); return; }
        userId = data.user.id;
    }

    // Upsert Profile
    const { error } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: 'Buyer B Test',
        role: 'buyer',
        company_id: companyId,
        is_active: true
    });

    if (error) console.error('Profile error:', error);
    else console.log('Buyer B created/updated successfully.');
}

createBuyerB();
