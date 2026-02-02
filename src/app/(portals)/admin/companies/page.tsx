import { getCompanies } from '@/lib/companies/actions'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database'

type CompanyRow = Database['public']['Tables']['companies']['Row']

export default async function CompaniesPage() {
    const { data: companies, error } = await getCompanies()
    const companyList = (companies ?? []) as CompanyRow[]

    return (
        <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fyrirtæki</h1>
                        <p className="text-muted-foreground mt-2">Stjórna viðskiptavinum (Manage customers)</p>
                    </div>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                        <Link href="/admin/companies/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nýtt fyrirtæki
                        </Link>
                    </Button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                        Villa við að sækja fyrirtæki: {error}
                    </div>
                )}

                {/* Table */}
                <Card className="border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[250px] font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                    Nafn (Name)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                    Kennitala
                                </TableHead>
                                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                    Tengiliður (Contact)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                    Netfang (Email)
                                </TableHead>
                                <TableHead className="w-[100px] font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                    Staða (Status)
                                </TableHead>
                                <TableHead className="w-[100px] text-right font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                    Aðgerðir
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companyList.length > 0 ? (
                                companyList.map((company) => (
                                    <TableRow key={company.id} className="hover:bg-muted/50 border-b border-border last:border-0">
                                        <TableCell className="font-medium py-4 text-foreground">
                                            {company.name}
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground font-mono text-sm">
                                            {company.kennitala || '-'}
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground">
                                            {company.contact_name}
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground">
                                            {company.contact_email}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge
                                                variant="secondary"
                                                className={company.is_active
                                                    ? "bg-green-100 text-green-800 hover:bg-green-100 font-medium"
                                                    : "bg-muted text-muted-foreground hover:bg-muted font-medium"}
                                            >
                                                {company.is_active ? 'Virkt' : 'Óvirkt'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="contact-actions text-right py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-blue-600">
                                                    <Link href={`/admin/companies/${company.id}/edit`} title="Breyta">
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {/* Delete button would go here - placeholder for now to avoid complexity without DeleteConfirm component */}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Engin fyrirtæki fundust.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
            </Card>
        </div>
    )
}
