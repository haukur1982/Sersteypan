'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserPreferences {
  features?: Record<string, boolean>
  visual_pilot?: boolean
  [key: string]: unknown
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'factory_manager' | 'buyer' | 'driver'
  companyId: string | null
  preferences: UserPreferences
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
  const isCancelledRef = useRef(false)

  useEffect(() => {
    // useEffect only runs on client after hydration
    isCancelledRef.current = false
    const supabase = createClient()

    // Helper to load profile
    const loadProfile = async (authUser: { id: string; email?: string }) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, role, company_id, preferences')
          .eq('id', authUser.id)
          .single()

        if (profile && !isCancelledRef.current) {
          setUser({
            id: authUser.id,
            email: authUser.email || profile.email,
            fullName: profile.full_name,
            role: profile.role as AuthUser['role'],
            companyId: profile.company_id,
            preferences: (profile.preferences || {}) as UserPreferences,
          })
        }
      } catch (error) {
        console.error('AuthProvider: Failed to load profile', error)
      }
    }

    // Use onAuthStateChange as primary - it fires immediately with current state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (isCancelledRef.current) return

        if (session?.user) {
          await loadProfile(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    // Safety timeout - ensure loading becomes false even if auth hangs
    const timeout = setTimeout(() => {
      if (!isCancelledRef.current) {
        console.warn('AuthProvider: Timeout reached, forcing loading to false')
        setLoading(false)
      }
    }, 5000)

    return () => {
      isCancelledRef.current = true
      clearTimeout(timeout)
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
