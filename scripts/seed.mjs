import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.'
    )
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
})

const seedConfig = {
    company: {
        name: 'Test Construction HF',
        address: 'Harbor Road 12',
        city: 'Reykjavik',
        postal_code: '101',
        contact_name: 'Arni Johannsson',
        contact_email: 'contact@testconstruction.is',
        contact_phone: '+354 555 0100',
        kennitala: '1234567890',
        is_active: true,
    },
    users: [
        {
            email: 'admin@sersteypan.test',
            password: 'Password123!',
            full_name: 'Admin User',
            role: 'admin',
        },
        {
            email: 'factory@sersteypan.test',
            password: 'Password123!',
            full_name: 'Factory Manager',
            role: 'factory_manager',
        },
        {
            email: 'buyer@sersteypan.test',
            password: 'Password123!',
            full_name: 'Project Buyer',
            role: 'buyer',
        },
        {
            email: 'driver@sersteypan.test',
            password: 'Password123!',
            full_name: 'Driver User',
            role: 'driver',
        },
    ],
    project: {
        name: 'Eddurell 6',
        description: 'Seed project for end-to-end testing.',
        address: 'Eddurell 6, Reykjavik',
        status: 'active',
        start_date: '2025-12-01',
        expected_end_date: '2026-06-30',
        notes: 'Seed data project.',
    },
    building: {
        name: 'Building A',
        floors: 4,
    },
    elements: [
        {
            name: 'F-01',
            element_type: 'filigran',
            status: 'planned',
            priority: 1,
            floor: 1,
        },
        {
            name: 'W-02',
            element_type: 'wall',
            status: 'rebar',
            priority: 3,
            floor: 1,
        },
        {
            name: 'S-03',
            element_type: 'staircase',
            status: 'cast',
            priority: 2,
            floor: 2,
        },
        {
            name: 'B-04',
            element_type: 'balcony',
            status: 'curing',
            priority: 0,
            floor: 2,
        },
        {
            name: 'W-05',
            element_type: 'wall',
            status: 'ready',
            priority: 5,
            floor: 3,
        },
        {
            name: 'F-06',
            element_type: 'filigran',
            status: 'loaded',
            priority: 4,
            floor: 3,
        },
        {
            name: 'C-07',
            element_type: 'column',
            status: 'delivered',
            priority: 2,
            floor: 4,
        },
    ],
}

async function getOrCreateCompany() {
    const { data: existing, error: existingError } = await supabase
        .from('companies')
        .select('id')
        .eq('name', seedConfig.company.name)
        .limit(1)
        .maybeSingle()

    if (existingError) throw existingError
    if (existing?.id) return existing.id

    const { data: inserted, error: insertError } = await supabase
        .from('companies')
        .insert(seedConfig.company)
        .select('id')
        .single()

    if (insertError) throw insertError
    return inserted.id
}

async function getUserIdByEmail(email) {
    const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
    })
    if (error) throw error
    const match = data.users.find((user) => user.email === email)
    return match?.id ?? null
}

async function getOrCreateUser(user) {
    const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
            full_name: user.full_name,
        },
    })

    if (!error && data?.user?.id) return data.user.id

    const alreadyExists =
        error?.message?.toLowerCase().includes('already registered') ||
        error?.message?.toLowerCase().includes('user already exists')

    if (!alreadyExists) {
        throw error
    }

    const existingId = await getUserIdByEmail(user.email)
    if (!existingId) {
        throw error
    }

    return existingId
}

async function upsertProfile({ id, companyId, user }) {
    const { error } = await supabase
        .from('profiles')
        .upsert(
            {
                id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                company_id: user.role === 'buyer' ? companyId : null,
                is_active: true,
            },
            { onConflict: 'id' }
        )

    if (error) throw error
}

async function getOrCreateProject({ companyId, createdBy }) {
    const { data: existing, error: existingError } = await supabase
        .from('projects')
        .select('id')
        .eq('name', seedConfig.project.name)
        .eq('company_id', companyId)
        .limit(1)
        .maybeSingle()

    if (existingError) throw existingError
    if (existing?.id) return existing.id

    const { data: inserted, error: insertError } = await supabase
        .from('projects')
        .insert({
            ...seedConfig.project,
            company_id: companyId,
            created_by: createdBy,
        })
        .select('id')
        .single()

    if (insertError) throw insertError
    return inserted.id
}

async function getOrCreateBuilding({ projectId }) {
    const { data: existing, error: existingError } = await supabase
        .from('buildings')
        .select('id')
        .eq('name', seedConfig.building.name)
        .eq('project_id', projectId)
        .limit(1)
        .maybeSingle()

    if (existingError) throw existingError
    if (existing?.id) return existing.id

    const { data: inserted, error: insertError } = await supabase
        .from('buildings')
        .insert({
            ...seedConfig.building,
            project_id: projectId,
        })
        .select('id')
        .single()

    if (insertError) throw insertError
    return inserted.id
}

async function upsertElements({ projectId, buildingId, createdBy }) {
    const names = seedConfig.elements.map((element) => element.name)
    const { data: existing, error: existingError } = await supabase
        .from('elements')
        .select('id,name')
        .eq('project_id', projectId)
        .in('name', names)

    if (existingError) throw existingError
    const existingNames = new Set((existing || []).map((row) => row.name))

    const toInsert = seedConfig.elements
        .filter((element) => !existingNames.has(element.name))
        .map((element) => ({
            ...element,
            project_id: projectId,
            building_id: buildingId,
            created_by: createdBy,
        }))

    let inserted = []
    if (toInsert.length > 0) {
        const { data, error } = await supabase
            .from('elements')
            .insert(toInsert)
            .select('id,name')

        if (error) throw error
        inserted = data || []
    }

    return [...(existing || []), ...inserted]
}

async function getOrCreateDelivery({ projectId, driverId, createdBy }) {
    const { data: existing, error: existingError } = await supabase
        .from('deliveries')
        .select('id')
        .eq('project_id', projectId)
        .eq('notes', 'Seed delivery')
        .limit(1)
        .maybeSingle()

    if (existingError) throw existingError
    if (existing?.id) return existing.id

    const { data: inserted, error: insertError } = await supabase
        .from('deliveries')
        .insert({
            project_id: projectId,
            driver_id: driverId,
            status: 'loading',
            planned_date: '2026-02-15',
            truck_registration: 'AB-123',
            truck_description: 'Seed truck',
            created_by: createdBy,
            notes: 'Seed delivery',
        })
        .select('id')
        .single()

    if (insertError) throw insertError
    return inserted.id
}

async function upsertDeliveryItems({ deliveryId, elementMap, driverId }) {
    const selectedElements = ['F-06', 'C-07']
        .map((name) => elementMap.get(name))
        .filter(Boolean)

    if (selectedElements.length === 0) return

    const { data: existing, error: existingError } = await supabase
        .from('delivery_items')
        .select('id,element_id')
        .eq('delivery_id', deliveryId)

    if (existingError) throw existingError
    const existingElementIds = new Set(
        (existing || []).map((row) => row.element_id)
    )

    const toInsert = selectedElements
        .filter((elementId) => !existingElementIds.has(elementId))
        .map((elementId) => ({
            delivery_id: deliveryId,
            element_id: elementId,
            loaded_at: new Date().toISOString(),
            loaded_by: driverId,
            load_position: 'Position 1',
        }))

    if (toInsert.length === 0) return

    const { error: insertError } = await supabase
        .from('delivery_items')
        .insert(toInsert)

    if (insertError) throw insertError
}

async function upsertPriorityRequests({ elementMap, buyerId }) {
    const requests = [
        {
            name: 'F-01',
            requested_priority: 8,
            reason: 'Need slab early for sequencing.',
        },
        {
            name: 'W-05',
            requested_priority: 9,
            reason: 'Crane scheduled for wall placement.',
        },
    ]

    const elementIds = requests
        .map((request) => elementMap.get(request.name))
        .filter(Boolean)

    if (elementIds.length === 0) return

    const { data: existing, error: existingError } = await supabase
        .from('priority_requests')
        .select('id,element_id,requested_by')
        .eq('requested_by', buyerId)
        .in('element_id', elementIds)

    if (existingError) throw existingError

    const existingElementIds = new Set(
        (existing || []).map((row) => row.element_id)
    )

    const toInsert = requests
        .map((request) => ({
            ...request,
            element_id: elementMap.get(request.name),
        }))
        .filter((request) => request.element_id)
        .filter((request) => !existingElementIds.has(request.element_id))
        .map((request) => ({
            element_id: request.element_id,
            requested_by: buyerId,
            requested_priority: request.requested_priority,
            reason: request.reason,
            status: 'pending',
        }))

    if (toInsert.length === 0) return

    const { error: insertError } = await supabase
        .from('priority_requests')
        .insert(toInsert)

    if (insertError) throw insertError
}

async function runSeed() {
    console.log('Starting seed...')
    const companyId = await getOrCreateCompany()

    const userIds = {}
    for (const user of seedConfig.users) {
        const userId = await getOrCreateUser(user)
        await upsertProfile({ id: userId, companyId, user })
        userIds[user.role] = userId
    }

    const projectId = await getOrCreateProject({
        companyId,
        createdBy: userIds.admin,
    })
    const buildingId = await getOrCreateBuilding({ projectId })
    const elements = await upsertElements({
        projectId,
        buildingId,
        createdBy: userIds.admin,
    })

    const elementMap = new Map(elements.map((row) => [row.name, row.id]))
    const deliveryId = await getOrCreateDelivery({
        projectId,
        driverId: userIds.driver,
        createdBy: userIds.admin,
    })
    await upsertDeliveryItems({
        deliveryId,
        elementMap,
        driverId: userIds.driver,
    })
    await upsertPriorityRequests({
        elementMap,
        buyerId: userIds.buyer,
    })

    console.log('Seed complete.')
    console.log('Seeded company:', companyId)
    console.log('Seeded project:', projectId)
}

runSeed().catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
})
