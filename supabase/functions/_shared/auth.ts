import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type UserRole = 'admin' | 'factory_manager' | 'buyer' | 'driver'

export interface AuthResult {
  success: boolean
  userId?: string
  role?: UserRole
  error?: string
}

/**
 * Verify the Authorization header and return user info.
 * Edge Functions should call this to authenticate requests.
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    return { success: false, error: 'Server configuration error' }
  }

  // Create a client using the user's token
  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false },
  })

  // Verify the token and get user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: 'Invalid or expired token' }
  }

  // Get user's role from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' }
  }

  return {
    success: true,
    userId: user.id,
    role: profile.role as UserRole,
  }
}

/**
 * Check if the user has one of the allowed roles.
 */
export function hasRole(auth: AuthResult, allowedRoles: UserRole[]): boolean {
  if (!auth.success || !auth.role) return false
  return allowedRoles.includes(auth.role)
}

/**
 * Validate that a string is a valid UUID v4.
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Rate limit configuration for Edge Functions.
 * Note: This is a simple in-memory implementation.
 * For production, use Redis or Supabase edge config.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}
