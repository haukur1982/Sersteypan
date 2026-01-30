'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ElementStatusBadge } from '../ElementStatusBadge'
import { PriorityRequestButton } from '../PriorityRequestButton'
import { ElementDetailDialog } from '../ElementDetailDialog'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { Element } from './types'

interface ElementsTabProps {
  elements: Element[]
}

export function ElementsTab({ elements }: ElementsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedElement, setSelectedElement] = useState<Element | null>(null)

  // Client-side filtering
  const filteredElements = elements.filter((element) => {
    const elementStatus = element.status || 'planned'
    const matchesSearch =
      searchTerm === '' ||
      element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (element.drawing_reference &&
        element.drawing_reference.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all' || elementStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  // Group elements by status for quick overview
  const statusCounts = elements.reduce(
    (acc, el) => {
      const statusKey = el.status || 'planned'
      acc[statusKey] = (acc[statusKey] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Leita eftir nafni eða teikningu (t.d. F-13)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="sm:w-64">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sía eftir stöðu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Allar stöður ({elements.length})</SelectItem>
                <SelectItem value="planned">
                  Skipulagt ({statusCounts.planned || 0})
                </SelectItem>
                <SelectItem value="rebar">
                  Járnabundið ({statusCounts.rebar || 0})
                </SelectItem>
                <SelectItem value="cast">
                  Steypt ({statusCounts.cast || 0})
                </SelectItem>
                <SelectItem value="curing">
                  Þornar ({statusCounts.curing || 0})
                </SelectItem>
                <SelectItem value="ready">
                  Tilbúið ({statusCounts.ready || 0})
                </SelectItem>
                <SelectItem value="loaded">
                  Á bíl ({statusCounts.loaded || 0})
                </SelectItem>
                <SelectItem value="delivered">
                  Afhent ({statusCounts.delivered || 0})
                </SelectItem>
                <SelectItem value="issue">
                  Vandamál ({statusCounts.issue || 0})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {searchTerm || statusFilter !== 'all' ? (
          <p className="text-sm text-zinc-600 mt-3">
            Sýni {filteredElements.length} af {elements.length} einingum
          </p>
        ) : null}
      </div>

      {/* Elements Table */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        {filteredElements.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-500 font-medium">Engar einingar fundust</p>
            <p className="text-sm text-zinc-400 mt-1">
              Breyttu leitarskilyrðum eða síu
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Heiti
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Tegund
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Hæð
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Staða
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Forgangur
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Aðgerðir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredElements.map((element) => {
                  const pendingRequest = element.priority_requests?.find(
                    (request) => request.status === 'pending'
                  )

                  return (
                    <tr
                      key={element.id}
                      className="hover:bg-zinc-50 cursor-pointer"
                      onClick={() => setSelectedElement(element)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-zinc-900">
                            {element.name}
                          </p>
                          {element.drawing_reference && (
                            <p className="text-sm text-zinc-500">
                              {element.drawing_reference}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {element.element_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {element.floor ? `Hæð ${element.floor}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <ElementStatusBadge status={element.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {(element.priority ?? 0) > 0 ? (
                          <span className="font-medium">
                            Forgangur {element.priority}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Enginn</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <PriorityRequestButton
                            elementId={element.id}
                            elementName={element.name}
                            currentPriority={element.priority ?? 0}
                            pendingRequest={pendingRequest}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Element Detail Modal */}
      {selectedElement && (
        <ElementDetailDialog
          element={selectedElement}
          open={!!selectedElement}
          onOpenChange={(open) => !open && setSelectedElement(null)}
        />
      )}
    </div>
  )
}
