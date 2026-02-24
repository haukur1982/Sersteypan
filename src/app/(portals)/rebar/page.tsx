import Link from 'next/link'
import { getRebarProjects, getRebarDashboardSummary } from '@/lib/rebar/queries'

export default async function RebarDashboardPage() {
  const [summary, projects] = await Promise.all([
    getRebarDashboardSummary(),
    getRebarProjects(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Járnabinding
        </h1>
        <p className="text-zinc-600 mt-1">Yfirlit yfir járnabindingu</p>
      </div>

      {/* Summary cards — big and touch-friendly */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
          <div className="text-5xl font-bold text-amber-700">
            {summary.needsRebar}
          </div>
          <div className="text-sm font-medium text-amber-600 mt-2">
            Þarfnast járnabindingar
          </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
          <div className="text-5xl font-bold text-blue-700">
            {summary.rebarInProgress}
          </div>
          <div className="text-sm font-medium text-blue-600 mt-2">
            Í vinnslu
          </div>
        </div>
      </div>

      {/* Project list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800">Verkefni</h2>

        {projects.length === 0 ? (
          <div className="bg-zinc-50 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-zinc-500 font-medium">
              Engin verkefni þarfnast járnabindingar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/rebar/projects/${project.id}`}
                className="block bg-white border border-zinc-200 rounded-2xl p-5 active:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-900 text-lg truncate">
                      {project.name}
                    </h3>
                    {project.address && (
                      <p className="text-sm text-zinc-500 truncate mt-0.5">
                        {project.address}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {project.needsRebar > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full">
                        {project.needsRebar} bíður
                      </span>
                    )}
                    {project.rebarInProgress > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                        {project.rebarInProgress} í vinnslu
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
