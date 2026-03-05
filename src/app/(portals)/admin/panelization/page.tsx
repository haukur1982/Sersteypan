import Link from 'next/link'
import { getAllLayouts } from '@/lib/panelization/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Grid3X3, Square, Layers } from 'lucide-react'

export default async function PanelizationHubPage() {
  const { data: layouts } = await getAllLayouts()

  // Group layouts by project
  type LayoutItem = (typeof layouts)[number]
  const byProject = new Map<string, { projectName: string; projectId: string; items: LayoutItem[] }>()
  for (const layout of layouts) {
    const pid = layout.project_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proj = (layout as any).project as { name: string } | null
    const projectName = proj?.name ?? 'Óþekkt verkefni'
    if (!byProject.has(pid)) {
      byProject.set(pid, { projectName, projectId: pid, items: [] })
    }
    byProject.get(pid)!.items.push(layout)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Plötusnið
          </h1>
          <p className="text-sm text-zinc-600">
            Öll plötusnið — skiptu veggjum og gólfplötum í framleiðsluhæfar einingar
          </p>
        </div>
      </div>

      {layouts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid3X3 className="h-12 w-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-1">
              Ekkert plötusnið enn
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-4">
              Opnaðu verkefni og smelltu á &quot;Plötusnið&quot; til að búa til
              fyrsta plötusniðið.
            </p>
            <Button asChild>
              <Link href="/admin/projects">Skoða verkefni</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Array.from(byProject.entries()).map(([pid, group]) => (
            <div key={pid}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-zinc-800">
                  {group.projectName}
                </h2>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/projects/${pid}/panelization`}>
                    Opna verkefni
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((layout) => {
                  const isCommitted = layout.status === 'committed'
                  const modeLabel = layout.mode === 'wall' ? 'Veggur' : 'Filigran'
                  const ModeIcon = layout.mode === 'wall' ? Square : Layers
                  const dims = `${(layout.surface_length_mm / 1000).toFixed(1)} × ${(layout.surface_height_mm / 1000).toFixed(1)} m`

                  return (
                    <Link
                      key={layout.id}
                      href={`/admin/projects/${pid}/panelization/${layout.id}`}
                      className="block"
                    >
                      <Card className="border-zinc-200 hover:border-zinc-400 transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base font-medium">
                              {layout.name}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={
                                isCommitted
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }
                            >
                              {isCommitted ? 'Staðfest' : 'Drög'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 text-sm text-zinc-600">
                            <div className="flex items-center gap-2">
                              <ModeIcon className="h-3.5 w-3.5" />
                              <Badge variant="outline" className="text-xs">
                                {modeLabel}
                              </Badge>
                              <span>{dims}</span>
                              <span>·</span>
                              <span>{layout.thickness_mm} mm</span>
                            </div>
                            {layout.floor != null && (
                              <p>Hæð {layout.floor}</p>
                            )}
                            {isCommitted && layout.elements_created != null && (
                              <p className="text-green-700 font-medium">
                                {layout.elements_created} einingar stofnaðar
                              </p>
                            )}
                            <p className="text-xs text-zinc-400">
                              {new Date(layout.created_at).toLocaleDateString('is-IS')}
                              {layout.profiles?.full_name && ` — ${layout.profiles.full_name}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
