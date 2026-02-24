import type { AuthUser } from '@/lib/providers/AuthProvider'

export function dashboardPathForRole(role: AuthUser['role']): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'factory_manager':
      return '/factory'
    case 'buyer':
      return '/buyer'
    case 'driver':
      return '/driver'
    case 'rebar_worker':
      return '/rebar'
    default:
      return '/login'
  }
}

