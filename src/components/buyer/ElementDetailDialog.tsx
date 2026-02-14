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
import { ElementTimeline } from '@/components/shared/ElementTimeline'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import { Clock, Image as ImageIcon, Flag } from 'lucide-react'
import type { Element } from '@/components/buyer/project/types'

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
              <PhotoGallery photos={element.photos || []} />
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
                            {request.created_at
                              ? new Date(request.created_at).toLocaleDateString('is-IS')
                              : 'Óþekkt'}
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
