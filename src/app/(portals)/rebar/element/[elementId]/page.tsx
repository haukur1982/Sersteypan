import { notFound } from 'next/navigation'
import { getRebarElement, getRebarDocuments } from '@/lib/rebar/queries'
import { RebarElementClient } from './RebarElementClient'

interface RebarElementPageProps {
  params: Promise<{
    elementId: string
  }>
}

export default async function RebarElementPage({ params }: RebarElementPageProps) {
  const { elementId } = await params

  const element = await getRebarElement(elementId)

  if (!element) {
    return notFound()
  }

  // Fetch rebar-related documents for this project
  const documents = await getRebarDocuments(element.project_id)

  // Normalize the project join
  const project = Array.isArray(element.project) ? element.project[0] : element.project

  return (
    <RebarElementClient
      element={{
        ...element,
        project: project ?? null,
      }}
      documents={documents}
    />
  )
}
