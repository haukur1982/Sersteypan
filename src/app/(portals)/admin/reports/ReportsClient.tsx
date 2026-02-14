'use client'

import { Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DateRangeFilter } from '@/components/admin/reports/DateRangeFilter'
import { ProductionCharts } from '@/components/admin/reports/ProductionCharts'
import { CycleTimeChart } from '@/components/admin/reports/CycleTimeChart'
import { DeliveryCharts } from '@/components/admin/reports/DeliveryCharts'
import { QualityCharts } from '@/components/admin/reports/QualityCharts'
import { ProjectProgressTable } from '@/components/admin/reports/ProjectProgressTable'
import type { ReportData } from '@/lib/admin/reportQueries'

interface ReportsClientProps {
  data: ReportData
}

export function ReportsClient({ data }: ReportsClientProps) {
  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Suspense fallback={null}>
        <DateRangeFilter />
      </Suspense>

      {/* Tabs */}
      <Tabs defaultValue="production">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="production">Framleiðsla</TabsTrigger>
          <TabsTrigger value="deliveries">Afhendingar</TabsTrigger>
          <TabsTrigger value="quality">Gæði</TabsTrigger>
          <TabsTrigger value="overview">Yfirlit</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-6 mt-4">
          <ProductionCharts
            throughput={data.throughput}
            elementTypes={data.elementTypes}
          />
          <CycleTimeChart
            cycleTime={data.cycleTime}
            bottleneck={data.bottleneck}
          />
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <DeliveryCharts stats={data.deliveryStats} />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <QualityCharts stats={data.qualityStats} />
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <ProjectProgressTable
            projects={data.projectProgress}
            overview={data.overview}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
