import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default async function AdminDashboard() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'admin') {
    redirect('/login')
  }

  // Fetch counts
  const supabase = await createClient()

  const [companiesResult, projectsResult, usersResult] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
  ])

  const companiesCount = companiesResult.count || 0
  const projectsCount = projectsResult.count || 0
  const usersCount = usersResult.count || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Stjórnborð
          </h1>
          <p className="text-zinc-600 mt-1">
            Velkomin, {user.fullName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/companies" className="group">
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 transition-all hover:border-blue-300 hover:shadow-md">
              <h3 className="text-sm font-medium text-zinc-500">Fyrirtæki</h3>
              <p className="text-3xl font-semibold text-zinc-900 mt-2">{companiesCount}</p>
              <p className="text-xs text-zinc-600 mt-1">Companies</p>
              <div className="flex items-center gap-1 text-xs text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                View all <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Link>

          <Link href="/admin/projects" className="group">
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 transition-all hover:border-blue-300 hover:shadow-md">
              <h3 className="text-sm font-medium text-zinc-500">Verkefni</h3>
              <p className="text-3xl font-semibold text-zinc-900 mt-2">{projectsCount}</p>
              <p className="text-xs text-zinc-600 mt-1">Projects</p>
              <div className="flex items-center gap-1 text-xs text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                View all <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-zinc-500">Notendur</h3>
            <p className="text-3xl font-semibold text-zinc-900 mt-2">{usersCount}</p>
            <p className="text-xs text-zinc-600 mt-1">Users</p>
            <p className="text-xs text-zinc-400 mt-3">Management coming soon</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start bg-white hover:bg-blue-50">
                <Link href="/admin/companies/new">+ New Company</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-white hover:bg-blue-50">
                <Link href="/admin/projects/new">+ New Project</Link>
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-3">
              System Status
            </h2>
            <div className="space-y-2 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Companies CRUD: Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Projects CRUD: Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Elements CRUD: Ready for testing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
