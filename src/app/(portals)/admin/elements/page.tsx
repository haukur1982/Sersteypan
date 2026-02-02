import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function ElementsPage() {
    const supabase = await createClient()

    // Fetch latest 100 elements
    const { data: elements } = await supabase
        .from('elements')
        .select(`
            *,
            project:projects(name, company:companies(name))
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    const statusConfig: Record<string, { label: string; color: string }> = {
        planned: { label: 'Skipulögð', color: 'bg-zinc-100 text-zinc-700' },
        design: { label: 'Hönnun', color: 'bg-blue-100 text-blue-700' },
        in_production: { label: 'Í framleiðslu', color: 'bg-yellow-100 text-yellow-800' },
        ready_for_delivery: { label: 'Tilbúið', color: 'bg-green-100 text-green-700' },
        delivered: { label: 'Afhent', color: 'bg-emerald-100 text-emerald-700' },
        // ... add others as needed
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Einingar (Elements)</h1>
                    <p className="text-muted-foreground">Yfirlit yfir allar einingar (Last 100)</p>
                </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Heiti</TableHead>
                            <TableHead>Verkefni</TableHead>
                            <TableHead>Tegund</TableHead>
                            <TableHead>Staða</TableHead>
                            <TableHead className="text-right">Stærð</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!elements || elements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    Engar einingar fundust.
                                </TableCell>
                            </TableRow>
                        ) : (
                            elements.map((element) => {
                                const status = statusConfig[element.status || 'planned'] || statusConfig.planned
                                return (
                                    <TableRow key={element.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">
                                            <Link href={`/admin/projects/${element.project_id}`} className="hover:underline text-primary">
                                                {element.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{element.project?.name}</span>
                                                <span className="text-xs text-muted-foreground">{element.project?.company?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="capitalize">{element.element_type}</TableCell>
                                        <TableCell>
                                            <Badge className={status.color}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {element.width_mm}x{element.height_mm}x{element.length_mm}mm
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
