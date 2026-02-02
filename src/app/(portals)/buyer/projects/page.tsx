import { getBuyerProjects } from '@/lib/buyer/queries'
import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'

export default async function ProjectsListPage() {
  const projects = await getBuyerProjects()

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Verkefni</h1>
          <p className="text-zinc-600 mt-1">
            Öll þín virk verkefni ({projects.length})
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-6 py-12 text-center">
            <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Engin verkefni</p>
            <p className="text-sm text-zinc-400 mt-1">
              Þú hefur engin virk verkefni
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project) => {
              const totalCount = project.elementCount
              const deliveredCount = project.statusBreakdown.delivered || 0
              const readyCount = project.statusBreakdown.ready || 0
              const inProgressCount =
                (project.statusBreakdown.rebar || 0) +
                (project.statusBreakdown.cast || 0) +
                (project.statusBreakdown.curing || 0)

              const progressPercent =
                totalCount > 0
                  ? Math.round((deliveredCount / totalCount) * 100)
                  : 0

              return (
                <Link
                  key={project.id}
                  href={`/buyer/projects/${project.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 transition-all hover:border-blue-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-zinc-900 truncate">
                          {project.name}
                        </h3>
                        <p className="text-sm text-zinc-600 mt-1">
                          {project.company?.name}
                        </p>
                        {project.address && (
                          <p className="text-sm text-zinc-500 mt-1">
                            {project.address}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-zinc-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-zinc-900">
                          {totalCount}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Einingar</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {inProgressCount}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Í vinnslu</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {deliveredCount}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Afhent</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-xs text-zinc-600 mb-2">
                        <span>Framvinda verkefnis</span>
                        <span className="font-medium">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Summary */}
                    {readyCount > 0 && (
                      <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">{readyCount}</span>{' '}
                          {readyCount === 1 ? 'eining tilbúin' : 'einingar tilbúnar'}{' '}
                          til afhendingar
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
