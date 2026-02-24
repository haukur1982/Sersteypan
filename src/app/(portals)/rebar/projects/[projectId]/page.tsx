import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRebarElements } from '@/lib/rebar/queries'
import { RebarProjectClient } from './RebarProjectClient'

interface RebarProjectPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function RebarProjectPage({ params }: RebarProjectPageProps) {
  const { projectId } = await params

  const supabase = await createClient()

  // Fetch project info
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, address')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return notFound()
  }

  // Fetch rebar-relevant elements
  const elements = await getRebarElements(projectId)

  return (
    <RebarProjectClient
      project={project}
      elements={elements}
    />
  )
}
