import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Package,
    ArrowLeft,
    Pencil
} from 'lucide-react'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']
type StockElement = Pick<ElementRow, 'id' | 'name' | 'element_type' | 'status' | 'priority' | 'floor' | 'created_at' | 'updated_at'> & {
    projects?: (Pick<ProjectRow, 'id' | 'name'> & { companies?: Pick<CompanyRow, 'name'> | null }) | null
}

const typeConfig = {
    wall: { label: 'Veggur' },
    filigran: { label: 'Filigran' },
    staircase: { label: 'Stigi' },
    balcony: { label: 'Svalir' },
    ceiling: { label: 'Þak' },
    column: { label: 'Súla' },
    beam: { label: 'Bita' },
    other: { label: 'Annað' }
}

export default async function StockPage() {
    const supabase = await createClient()

    // Fetch elements that are 'ready' (in stock)
    const { data: elements, error } = await supabase
        .from('elements')
        .select(`
            id,
            name,
            element_type,
            status,
            priority,
            floor,
            created_at,
            updated_at,
            projects (
                id,
                name,
                companies (
                    name
                )
            )
        `)
        .eq('status', 'ready')
        .order('updated_at', { ascending: false }) // Show most recently ready first
    const elementList = (elements ?? []) as StockElement[]

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/factory">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                Lager (Stock)
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Einingar sem eru tilbúnar til afhendingar
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja lagerstöðu:</p>
                        <p className="text-xs text-red-600 mt-1 font-mono">{error.message}</p>
                    </div>
                )}

                {/* Elements Table */}
                <Card className="border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                    Forgangur
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                    Nafn (Name)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                    Verkefni (Project)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                    Tegund (Type)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                    Kl klárt (Ready Time)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-muted-foreground uppercase tracking-wider text-right">
                                    Aðgerðir
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {elementList.length > 0 ? (
                                elementList.map((element) => {
                                    const typeInfo = typeConfig[element.element_type as keyof typeof typeConfig] || typeConfig.other

                                    return (
                                        <TableRow key={element.id} className="hover:bg-muted/50">
                                            <TableCell className="py-4">
                                                {element.priority > 0 ? (
                                                    <span className="font-bold text-orange-600">
                                                        {element.priority}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/50">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold text-foreground py-4">
                                                {element.name}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {element.projects?.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {element.projects?.companies?.name}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    {typeInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 text-muted-foreground">
                                                {new Date(element.updated_at).toLocaleDateString('is-IS')}
                                            </TableCell>
                                            <TableCell className="py-4 text-right">
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-blue-600">
                                                    <Link href={`/factory/production/${element.id}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="w-8 h-8 text-muted" />
                                            <p>Engar einingar á lager (None in stock)</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Summary */}
                {elementList.length > 0 && (
                    <div className="text-sm text-muted-foreground text-center">
                        {elementList.length} {elementList.length === 1 ? 'eining' : 'einingar'} á lager
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
