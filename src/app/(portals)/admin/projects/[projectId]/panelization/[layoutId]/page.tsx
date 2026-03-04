import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getLayoutWithDetails } from '@/lib/panelization/queries'
import { PanelizationEditor } from '@/components/panelization/PanelizationEditor'

export default async function PanelizationEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; layoutId: string }>
}) {
  const { projectId, layoutId } = await params

  const [{ data: project, error: projectError }, layoutResult] =
    await Promise.all([
      getProject(projectId),
      getLayoutWithDetails(layoutId),
    ])

  if (projectError || !project) notFound()
  if (layoutResult.error || !layoutResult.layout) notFound()

  // Verify the layout belongs to this project
  if (layoutResult.layout.project_id !== projectId) notFound()

  return (
    <PanelizationEditor
      projectId={projectId}
      projectName={project.name}
      layout={layoutResult.layout}
      panels={layoutResult.panels}
      openings={layoutResult.openings}
    />
  )
}
