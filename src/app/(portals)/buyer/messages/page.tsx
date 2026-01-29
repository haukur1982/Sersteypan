import { getUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { getBuyerProjects } from '@/lib/buyer/queries'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

export default async function MessagesPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'buyer') {
    redirect('/login')
  }

  const projects = await getBuyerProjects()

  // Note: In real implementation, would need a dedicated query for this
  // For now, this page shows that messages are in project detail pages

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Skilaboð</h1>
          <p className="text-zinc-600 mt-1">
            Öll skilaboð tengd þínum verkefnum
          </p>
        </div>

        {/* Projects with Messages */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-200">
            <h2 className="font-semibold text-zinc-900">
              Verkefni með skilaboðum
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">Engin verkefni</p>
              <p className="text-sm text-zinc-400 mt-1">
                Þú hefur engin virk verkefni
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/buyer/projects/${project.id}?tab=messages`}
                  className="block px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-zinc-900">
                        {project.name}
                      </h3>
                      <p className="text-sm text-zinc-600 mt-1">
                        {project.company?.name}
                      </p>
                    </div>
                    <MessageSquare className="w-5 h-5 text-zinc-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">💡 Ábending</p>
          <p>
            Skilaboð eru tilgreind á hverju verkefni fyrir sig. Farðu inn á
            verkefni og veldu &quot;Skilaboð&quot; flipann til að sjá og senda skilaboð.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
