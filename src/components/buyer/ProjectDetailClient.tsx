'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ElementsTab } from '@/components/buyer/project/ElementsTab'
import { DeliveriesTab } from '@/components/buyer/project/DeliveriesTab'
import { DocumentsTab } from '@/components/buyer/project/DocumentsTab'
import { MessagesTab } from '@/components/buyer/project/MessagesTab'
import { Status3DTab } from '@/components/buyer/project/Status3DTab'
import { ArrowLeft, Building2, MapPin, Calendar, Layers } from 'lucide-react'
import Link from 'next/link'
import type { Project, Delivery } from './project/types'
import type { FloorPlan } from '@/components/shared/3d/ProjectScene'

interface ProjectDetailClientProps {
  project: Project
  deliveries: Delivery[]
  floorPlans?: FloorPlan[]
  tab?: string
}

export function ProjectDetailClient({ project, deliveries, floorPlans = [], tab }: ProjectDetailClientProps) {
  const router = useRouter()
  const elements = project.elements || []

  // Set up real-time subscriptions for this project
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to element changes for this project
    const elementsChannel = supabase
      .channel(`project-${project.id}-elements`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'elements',
          filter: `project_id=eq.${project.id}`
        },
        (payload) => {
          console.log('Element changed in project, refreshing:', payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to project ${project.id} elements`)
        }
      })

    // Subscribe to delivery changes for this project
    const deliveriesChannel = supabase
      .channel(`project-${project.id}-deliveries`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `project_id=eq.${project.id}`
        },
        (payload) => {
          console.log('Delivery changed in project, refreshing:', payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to project ${project.id} deliveries`)
        }
      })

    // Subscribe to message changes for this project
    const messagesChannel = supabase
      .channel(`project-${project.id}-messages`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${project.id}`
        },
        (payload) => {
          console.log('Message changed in project, refreshing:', payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to project ${project.id} messages`)
        }
      })

    // Cleanup on unmount
    return () => {
      elementsChannel.unsubscribe()
      deliveriesChannel.unsubscribe()
      messagesChannel.unsubscribe()
    }
  }, [project.id, router])

  // Calculate stats
  const totalElements = elements.length
  const deliveredCount = elements.filter((e) => e.status === 'delivered').length
  const readyCount = elements.filter((e) => e.status === 'ready').length
  const inProgressCount = elements.filter(
    (e) => e.status === 'rebar' || e.status === 'cast' || e.status === 'curing'
  ).length

  const progressPercent =
    totalElements > 0 ? Math.round((deliveredCount / totalElements) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/buyer/projects"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Til baka í verkefnalista
        </Link>

        <h1 className="text-3xl font-bold text-zinc-900">{project.name}</h1>

        <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-600">
          {project.company && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{project.company.name}</span>
            </div>
          )}
          {project.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{project.address}</span>
            </div>
          )}
          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Byrjað: {new Date(project.start_date).toLocaleDateString('is-IS')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
          <p className="text-sm text-zinc-500">Heildarfjöldi</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {totalElements}
          </p>
          <p className="text-xs text-zinc-500 mt-1">einingar</p>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
          <p className="text-sm text-zinc-500">Í vinnslu</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {inProgressCount}
          </p>
          <p className="text-xs text-zinc-500 mt-1">járnabinding - þornar</p>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
          <p className="text-sm text-zinc-500">Tilbúið</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{readyCount}</p>
          <p className="text-xs text-zinc-500 mt-1">tilbúið til afhendingar</p>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
          <p className="text-sm text-zinc-500">Afhent</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {deliveredCount}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{progressPercent}% lokið</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-zinc-900">Framvinda verkefnis</h3>
          <span className="text-sm font-medium text-zinc-600">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-zinc-200 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-zinc-600 mt-2">
          {deliveredCount} af {totalElements} einingum afhent
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tab || "elements"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="elements">
            Einingar ({totalElements})
          </TabsTrigger>
          <TabsTrigger value="status3d" className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Ghost Building
          </TabsTrigger>
          <TabsTrigger value="deliveries">Afhendingar</TabsTrigger>
          <TabsTrigger value="documents">
            Skjöl ({(project.documents || []).length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            Skilaboð ({(project.messages || []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elements">
          <ElementsTab elements={elements} />
        </TabsContent>

        <TabsContent value="status3d">
          <Status3DTab floorPlans={floorPlans} />
        </TabsContent>

        <TabsContent value="deliveries">
          <DeliveriesTab deliveries={deliveries} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab documents={project.documents || []} />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab
            messages={project.messages || []}
            projectId={project.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
