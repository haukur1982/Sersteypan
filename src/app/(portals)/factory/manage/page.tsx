import { createClient } from '@/lib/supabase/server'
import { ClipboardList } from 'lucide-react'
import { ManageProductionView } from '@/components/factory/ManageProductionView'

export default async function ManageProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // Fetch all active projects (factory sees all)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .in('status', ['active', 'in_progress'])
    .order('name')

  const allProjects = projects || []

  // Use project from URL params, or default to first project
  const requestedProjectId = params.project
  const defaultProjectId =
    (requestedProjectId && allProjects.some((p) => p.id === requestedProjectId)
      ? requestedProjectId
      : allProjects[0]?.id) || null

  // Fetch elements for selected project with batch info
  let elements: Array<{
    id: string
    name: string
    element_type: string
    status: string | null
    floor: number | null
    weight_kg: number | null
    batch_id: string | null
    batch_number: string | null
    production_batches: {
      id: string
      batch_number: string
      batch_date: string
      status: string
      checklist: unknown
      air_temperature_c: number | null
      concrete_grade: string | null
    } | null
  }> = []

  if (defaultProjectId) {
    const { data: elementData } = await supabase
      .from('elements')
      .select(`
        id, name, element_type, status, floor, weight_kg, batch_id, batch_number,
        production_batches!elements_batch_id_fkey (
          id, batch_number, batch_date, status, checklist, air_temperature_c, concrete_grade
        )
      `)
      .eq('project_id', defaultProjectId)
      .order('floor', { ascending: true })
      .order('name', { ascending: true })

    elements = (elementData || []) as typeof elements
  }

  // Fetch active batches for this project (preparing/checklist status)
  let activeBatches: Array<{
    id: string
    batch_number: string
    batch_date: string
    status: string
    checklist: unknown
    air_temperature_c: number | null
    concrete_grade: string | null
    concrete_supplier: string | null
  }> = []

  if (defaultProjectId) {
    const { data: batchData } = await supabase
      .from('production_batches')
      .select('id, batch_number, batch_date, status, checklist, air_temperature_c, concrete_grade, concrete_supplier')
      .eq('project_id', defaultProjectId)
      .in('status', ['preparing', 'checklist'])
      .order('batch_date', { ascending: false })

    activeBatches = (batchData || []) as typeof activeBatches
  }

  // Fetch active rebar batches for this project
  let activeRebarBatches: Array<{
    id: string
    batch_number: string
    batch_date: string
    status: string
    checklist: unknown
    air_temperature_c: number | null
    concrete_grade: string | null
    concrete_supplier: string | null
  }> = []

  if (defaultProjectId) {
    const { data: rebarBatchData } = await supabase
      .from('rebar_batches')
      .select('id, batch_number, batch_date, status, checklist')
      .eq('project_id', defaultProjectId)
      .in('status', ['preparing', 'qc_ready'])
      .order('batch_date', { ascending: false })

    activeRebarBatches = (rebarBatchData || []).map(b => ({
      ...b,
      air_temperature_c: null,
      concrete_grade: null,
      concrete_supplier: null
    })) as typeof activeRebarBatches
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          Framleiðslustjórn
        </h1>
        <p className="text-zinc-600 mt-1">
          Yfirlit yfir framleiðslu — gátlistar, einingar eftir tegund og hæð, steypulotur
        </p>
      </div>

      <ManageProductionView
        projects={allProjects}
        defaultProjectId={defaultProjectId}
        elements={elements}
        activeBatches={activeBatches}
        activeRebarBatches={activeRebarBatches}
      />
    </div>
  )
}
