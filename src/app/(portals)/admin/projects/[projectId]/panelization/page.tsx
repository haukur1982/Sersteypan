import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getLayoutsForProject } from '@/lib/panelization/queries'
import { getProjectBuildings } from '@/lib/drawing-analysis/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Grid3X3,
  Layers,
  Square,
  Truck,
  Weight,
  Ruler,
  Info,
} from 'lucide-react'
import { PanelizationCreateDialog } from '@/components/panelization/PanelizationCreateDialog'

export default async function PanelizationPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  const { data: project, error } = await getProject(projectId)
  if (error || !project) notFound()

  const [layoutsResult, buildings] = await Promise.all([
    getLayoutsForProject(projectId),
    getProjectBuildings(projectId),
  ])

  const layouts = layoutsResult.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href={`/admin/projects/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Plötusnið
            </h1>
          </div>
          <p className="text-sm text-zinc-600 ml-10">
            {project.name} — Skiptu veggjum og gólfplötum í framleiðsluhæfar einingar
          </p>
        </div>

        <PanelizationCreateDialog
          projectId={projectId}
          buildings={buildings}
        />
      </div>

      {/* Educational guide — always visible */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Info className="h-4 w-4" />
            Hvernig virkar plötusnið?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wall panelization explanation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-blue-700" />
                <h4 className="font-medium text-sm text-blue-900">
                  Veggplötusnið
                </h4>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Steyptum veggjum er skipt í lóðréttar plötur sem hægt er að
                steypa á borði í verksmiðju, flytja á bíl og lyfta á sinn stað
                með krana. Skiptingin ræðst af:
              </p>
              <ul className="text-xs text-blue-700 space-y-1.5 ml-1">
                <li className="flex items-start gap-2">
                  <Ruler className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Opum</strong> — gluggar og hurðir ákvarða hvar
                    eðlilegt er að skipta. Plötur klippast aldrei í gegnum op.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Weight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Þyngd</strong> — hver plata má ekki vera þyngri en
                    krani á verksmiðju og á byggingarstað ræður (~10 tonn).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Flutningur</strong> — breidd og hæð plötu takmarkast
                    af flutningsbíl (~3 m breidd).
                  </span>
                </li>
              </ul>
              {/* Mini ASCII diagram */}
              <div className="bg-white rounded-md border border-blue-100 p-3 font-mono text-[10px] text-blue-800 leading-tight whitespace-pre">
{`┌──────────┬───┬──────────┬──────────┐
│          │   │          │          │
│  V-101   │   │  V-102   │  V-103   │
│          │ G │          │          │
│  2.5m    │   │  1.8m    │  2.2m    │
│          │   │          │          │
│          │   │          │          │
└──────────┴───┴──────────┴──────────┘
  ← fúga →  G = gluggi    ← fúga →`}
              </div>
            </div>

            {/* Filigran panelization explanation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-700" />
                <h4 className="font-medium text-sm text-blue-900">
                  Filigransnið
                </h4>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Filigranplötur eru þunnar (60 mm) forstentar gólfplötur sem
                lagðar eru á undirstöður og síðan steypt ofan á þær á
                byggingarstað. Gólfflöt er skipt í samhliða remsur:
              </p>
              <ul className="text-xs text-blue-700 space-y-1.5 ml-1">
                <li className="flex items-start gap-2">
                  <Ruler className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Breidd remsna</strong> — yfirleitt 2,4–2,5 m eftir
                    steypuborði verksmiðjunnar. Allar remsur jafnbreiðar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Lengd remsna</strong> — takmarkast af bílpalli
                    (~12 m) og steypuborði.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Weight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Stefna</strong> — remsur geta legið meðfram lengd
                    eða breidd herbergis eftir burðarþoli.
                  </span>
                </li>
              </ul>
              {/* Mini ASCII diagram */}
              <div className="bg-white rounded-md border border-blue-100 p-3 font-mono text-[10px] text-blue-800 leading-tight whitespace-pre">
{`┌───────────────────────────────────┐
│           F-101  (2.4m)           │
├───────────────────────────────────┤ fúga
│           F-102  (2.4m)           │
├───────────────────────────────────┤ fúga
│           F-103  (2.4m)           │
├───────────────────────────────────┤ fúga
│           F-104  (1.8m)           │
└───────────────────────────────────┘
     ← remsur meðfram lengd →`}
              </div>
            </div>
          </div>

          {/* Workflow steps */}
          <div className="mt-4 pt-4 border-t border-blue-100">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">
              Vinnuflæði
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-blue-700">
              <span className="bg-white border border-blue-200 rounded-full px-3 py-1">
                1. Skilgreindu flöt
              </span>
              <span className="text-blue-400">→</span>
              <span className="bg-white border border-blue-200 rounded-full px-3 py-1">
                2. Settu skorður
              </span>
              <span className="text-blue-400">→</span>
              <span className="bg-white border border-blue-200 rounded-full px-3 py-1">
                3. Bættu við opum
              </span>
              <span className="text-blue-400">→</span>
              <span className="bg-white border border-blue-200 rounded-full px-3 py-1">
                4. Skoðaðu niðurstöðu
              </span>
              <span className="text-blue-400">→</span>
              <span className="bg-white border border-blue-200 rounded-full px-3 py-1 font-medium">
                5. Stofna einingar
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layouts List */}
      {layouts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid3X3 className="h-12 w-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-1">
              Ekkert plötusnið enn
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-4">
              Smelltu á &quot;Nýtt plötusnið&quot; til að byrja. Kerfið reiknar
              sjálfkrafa bestu skiptingu miðað við skorður verksmiðjunnar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map((layout) => {
            const isCommitted = layout.status === 'committed'
            const modeLabel = layout.mode === 'wall' ? 'Veggur' : 'Filigran'
            const dims = `${(layout.surface_length_mm / 1000).toFixed(1)} × ${(layout.surface_height_mm / 1000).toFixed(1)} m`

            return (
              <Link
                key={layout.id}
                href={`/admin/projects/${projectId}/panelization/${layout.id}`}
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
      )}
    </div>
  )
}
