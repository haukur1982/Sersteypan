import { getServerUser } from '@/lib/auth/getServerUser'
import { getBuyerProjectsWithFramvinda } from '@/lib/framvinda/queries'
import { formatISK } from '@/lib/framvinda/calculations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function BuyerFramvindaPage() {
  const user = await getServerUser()
  if (!user?.companyId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Framvinda
        </h1>
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="py-12 text-center text-zinc-500">
            Enginn fyrirtækjatengsl fundust.
          </CardContent>
        </Card>
      </div>
    )
  }

  const projects = await getBuyerProjectsWithFramvinda(user.companyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Framvinda
        </h1>
        <p className="text-zinc-600 mt-1">
          Staða framvinda og framvinduyfirlit yfir verkefni
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="py-12 text-center text-zinc-500">
            Engin verkefni með framvinda fundust.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">
                        {project.name}
                      </h3>
                      {project.address && (
                        <p className="text-sm text-zinc-500">{project.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-zinc-500">Lokaðar framvindur</p>
                      <p className="font-semibold text-zinc-900">
                        {project.period_count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-500">Heildarrukkun</p>
                      <p className="font-semibold text-zinc-900 tabular-nums">
                        {formatISK(project.total_billed)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/buyer/framvinda/${project.id}`}>
                        Skoða
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
