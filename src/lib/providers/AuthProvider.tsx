'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'factory_manager' | 'buyer' | 'driver'
  companyId: string | null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Single fetch for auth + profile data
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (authUser) {
          // Fetch profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, role, company_id')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            setUser({
              id: authUser.id,
              email: authUser.email!,
              fullName: profile.full_name,
              role: profile.role as AuthUser['role'],
              companyId: profile.company_id,
            })
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, role, company_id')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              fullName: profile.full_name,
              role: profile.role as AuthUser['role'],
              companyId: profile.company_id,
            })
          }
        } else {
          setUser(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
