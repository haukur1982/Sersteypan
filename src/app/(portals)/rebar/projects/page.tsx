import Link from 'next/link'
import { getRebarProjects } from '@/lib/rebar/queries'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

export default async function RebarProjectsPage() {
  const projects = await getRebarProjects()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Verkefni
        </h1>
        <p className="text-zinc-600 mt-1">
          Verkefni sem þarfnast járnabindingar
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-zinc-500 font-medium text-lg">
            Engin verkefni þarfnast járnabindingar
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/rebar/projects/${project.id}`}
            >
              <Card className="p-5 active:bg-zinc-50 transition-colors mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-zinc-900 truncate">
                      {project.name}
                    </h3>
                    {project.address && (
                      <p className="text-sm text-zinc-500 truncate mt-0.5">
                        {project.address}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2">
                      {project.needsRebar > 0 && (
                        <span className="text-sm font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {project.needsRebar} bíður
                        </span>
                      )}
                      {project.rebarInProgress > 0 && (
                        <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          {project.rebarInProgress} í vinnslu
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-zinc-400 shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
