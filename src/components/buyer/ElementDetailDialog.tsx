'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ElementStatusBadge } from './ElementStatusBadge'
import { ElementTimeline } from './ElementTimeline'
import { Clock, Image as ImageIcon, Flag } from 'lucide-react'
import Image from 'next/image'
import type { Database } from '@/types/database'

type Element = {
  id: string
  name: string
  element_type: string
  drawing_reference: string | null
  floor: number | null
  position_description: string | null
  status: Database['public']['Tables']['elements']['Row']['status']
  priority: number | null
  photos: Database['public']['Tables']['element_photos']['Row'][]
  events: Array<Database['public']['Tables']['element_events']['Row'] & {
    created_by?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'> | null
  }>
  priority_requests: Array<Database['public']['Tables']['priority_requests']['Row'] & {
    requested_by?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'> | null
  }>
}

interface ElementDetailDialogProps {
  element: Element
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ElementDetailDialog({
  element,
  open,
  onOpenChange
}: ElementDetailDialogProps) {
  const priorityValue = element.priority ?? 0

  // Group photos by stage
  const photosByStage = (element.photos || []).reduce(
    (acc, photo) => {
      const stage = photo.stage || 'other'
      if (!acc[stage]) acc[stage] = []
      acc[stage].push(photo)
      return acc
    },
    {} as Record<string, Database['public']['Tables']['element_photos']['Row'][]>
  )

  const stageLabels: Record<string, string> = {
    rebar: 'Járnabinding',
    cast: 'Steyptu',
    ready: 'Tilbúið',
    before_delivery: 'Fyrir afhendingu',
    after_delivery: 'Eftir afhendingu'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{element.name}</DialogTitle>
          <DialogDescription>
            {element.element_type}
            {element.drawing_reference && ` • ${element.drawing_reference}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Element Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-zinc-500">Staða</p>
              <div className="mt-1">
                <ElementStatusBadge status={element.status} />
              </div>
            </div>

            {element.floor && (
              <div>
                <p className="text-sm text-zinc-500">Hæð</p>
                <p className="font-medium text-zinc-900 mt-1">
                  Hæð {element.floor}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-zinc-500">Forgangur</p>
              <p className="font-medium text-zinc-900 mt-1">
                {priorityValue > 0 ? `Forgangur ${priorityValue}` : 'Enginn'}
              </p>
            </div>

            {element.position_description && (
              <div>
                <p className="text-sm text-zinc-500">Staðsetning</p>
                <p className="font-medium text-zinc-900 mt-1 text-sm">
                  {element.position_description}
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Saga</span>
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span>Myndir ({(element.photos || []).length})</span>
              </TabsTrigger>
              <TabsTrigger value="priority" className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                <span>Forgangur</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <ElementTimeline events={element.events || []} />
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              {(element.photos || []).length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">Engar myndir</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Engar myndir hafa verið teknar af þessari einingu
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(photosByStage).map(([stage, photos]) => (
                    <div key={stage}>
                      <h4 className="font-medium text-zinc-900 mb-3">
                        {stageLabels[stage] || stage}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200"
                          >
                            <Image
                              src={photo.photo_url}
                              alt={photo.caption || 'Element photo'}
                              fill
                              sizes="(max-width: 640px) 50vw, 33vw"
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                                {photo.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="priority" className="mt-4">
              <div className="space-y-4">
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <p className="text-sm text-zinc-600">Núverandi forgangur</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">
                    {priorityValue > 0 ? priorityValue : 'Enginn'}
                  </p>
                </div>

                {(element.priority_requests || []).length === 0 ? (
                  <div className="text-center py-8">
                    <Flag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">
                      Engar forgangs beiðnir
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Þú hefur ekki óskað eftir forgangsbreytingu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium text-zinc-900">Beiðnasaga</h4>
                    {element.priority_requests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-zinc-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900">
                                Forgangur {request.requested_priority}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  request.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : request.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {request.status === 'pending' && 'Í vinnslu'}
                                {request.status === 'approved' && 'Samþykkt'}
                                {request.status === 'denied' && 'Hafnað'}
                                {request.status === 'modified' && 'Breytt'}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-600 mt-2">
                              {request.reason}
                            </p>
                            {request.review_notes && (
                              <div className="mt-3 p-3 bg-zinc-50 rounded-md">
                                <p className="text-xs font-medium text-zinc-700">
                                  Svör frá framleiðslustjóra:
                                </p>
                                <p className="text-sm text-zinc-600 mt-1">
                                  {request.review_notes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs text-zinc-500">
                            {new Date(request.created_at).toLocaleDateString('is-IS')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
