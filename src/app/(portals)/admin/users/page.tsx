import { getUsers } from '@/lib/users/actions'
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
import { FeatureToggler } from './FeatureToggler'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']
type UserWithCompany = ProfileRow & { companies?: Pick<CompanyRow, 'id' | 'name'> | null; preferences?: Record<string, unknown> | null }

const roleConfig = {
    admin: { color: 'bg-red-100 text-red-800', label: 'Admin' },
    factory_manager: { color: 'bg-blue-100 text-blue-800', label: 'Verkstjóri' },
    buyer: { color: 'bg-green-100 text-green-800', label: 'Kaupandi' },
    driver: { color: 'bg-purple-100 text-purple-800', label: 'Bílstjóri' }
}

export default async function UsersPage() {
    const { data: users, error } = await getUsers()
    const userList = (users ?? []) as UserWithCompany[]

    return (
        <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Notendur</h1>
                        <p className="text-zinc-600 mt-2">Yfirlit yfir notendur (Users Overview)</p>
                    </div>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                        <Link href="/admin/users/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nýr notandi
                        </Link>
                    </Button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                        Villa við að sækja notendur: {error}
                    </div>
                )}

                {/* Table */}
                <Card className="border-zinc-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-50">
                            <TableRow>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Nafn (Name)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Netfang (Email)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Hlutverk (Role)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Fyrirtæki (Company)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Aðgerðir (Features)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Staða (Status)
                                </TableHead>
                                <TableHead className="w-[100px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Breyta
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {userList.length > 0 ? (
                                userList.map((user) => {
                                    const roleInfo = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.admin

                                    return (
                                        <TableRow key={user.id} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                                            <TableCell className="font-medium py-4 text-zinc-900">
                                                {user.full_name}
                                            </TableCell>
                                            <TableCell className="py-4 text-zinc-600">
                                                {user.email}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="secondary" className={`${roleInfo.color} font-medium border-0`}>
                                                    {roleInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 text-zinc-600">
                                                {user.companies?.name || '-'}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <FeatureToggler
                                                    userId={user.id}
                                                    featureKey="visual_pilot"
                                                    initialValue={(user.preferences as Record<string, unknown>)?.visual_pilot === true}
                                                    label="Visual Pilot"
                                                />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                {user.is_active ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-0">
                                                        Virkur
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-0">
                                                        Óvirkur
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                    <Link href={`/admin/users/${user.id}/edit`} title="Breyta (Edit)">
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                                        Engir notendur fundust.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
            </Card>
        </div>
    )
}
