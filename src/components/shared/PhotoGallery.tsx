'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X, ZoomIn, Download, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ElementPhoto } from '@/components/buyer/project/types'

interface PhotoGalleryProps {
  photos: ElementPhoto[]
  className?: string
}

const stageLabels: Record<string, string> = {
  rebar: 'Járnabinding',
  cast: 'Steypt',
  curing: 'Þornar',
  ready: 'Tilbúið',
  loaded: 'Hlaðið',
  before_delivery: 'Fyrir afhendingu',
  after_delivery: 'Eftir afhendingu'
}

export function PhotoGallery({ photos, className = '' }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ElementPhoto | null>(null)

  if (photos.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-zinc-500 font-medium">Engar myndir</p>
        <p className="text-sm text-zinc-400 mt-1">
          Myndir munu birtast hér þegar þær eru hlaðnar upp
        </p>
      </div>
    )
  }

  // Group photos by stage
  const photosByStage = photos.reduce<Record<string, ElementPhoto[]>>((acc, photo) => {
    const stage = photo.stage || 'other'
    if (!acc[stage]) {
      acc[stage] = []
    }
    acc[stage].push(photo)
    return acc
  }, {})

  // Sort stages in workflow order
  const stageOrder = ['rebar', 'cast', 'curing', 'ready', 'loaded', 'before_delivery', 'after_delivery']
  const sortedStages = Object.keys(photosByStage).sort((a, b) => {
    const aIndex = stageOrder.indexOf(a)
    const bIndex = stageOrder.indexOf(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {sortedStages.map((stage) => (
          <div key={stage}>
            {/* Stage Header */}
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              {stageLabels[stage] || stage}
              <span className="text-zinc-500 font-normal ml-2">
                ({photosByStage[stage].length} myndir)
              </span>
            </h3>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photosByStage[stage].map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-100 hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <Image
                    src={photo.photo_url}
                    alt={`${stageLabels[stage]} photo`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Metadata */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">
                      {photo.taken_at
                        ? new Date(photo.taken_at).toLocaleDateString('is-IS')
                        : 'Óþekkt'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Image */}
              <div className="relative aspect-[4/3] w-full bg-black">
                <Image
                  src={selectedPhoto.photo_url}
                  alt={`${stageLabels[selectedPhoto.stage || '']} photo`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 896px"
                  priority
                />
              </div>

              {/* Metadata Bar */}
              <div className="bg-white border-t border-zinc-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 text-sm text-zinc-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {selectedPhoto.taken_at
                          ? new Date(selectedPhoto.taken_at).toLocaleString('is-IS')
                          : 'Óþekkt'}
                      </span>
                    </div>

                    {selectedPhoto.created_by && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{selectedPhoto.created_by.full_name}</span>
                      </div>
                    )}

                    <div className="px-2 py-1 bg-zinc-100 rounded text-xs font-medium">
                      {stageLabels[selectedPhoto.stage || ''] || selectedPhoto.stage}
                    </div>
                  </div>

                  {/* Download button */}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={selectedPhoto.photo_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Niðurhala
                    </a>
                  </Button>
                </div>

                {/* Caption if exists */}
                {selectedPhoto.caption && (
                  <p className="text-sm text-zinc-600 mt-3 border-t border-zinc-200 pt-3">
                    {selectedPhoto.caption}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
