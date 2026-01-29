import { getCompanies } from '@/lib/companies/actions'
import { createUser } from '@/lib/users/actions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Database } from '@/types/database'

type CompanyRow = Database['public']['Tables']['companies']['Row']

export default async function NewUserPage() {
    // Fetch companies for buyer role assignment
    const { data: companies } = await getCompanies()
    const companyList = (companies ?? []) as CompanyRow[]

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-2xl">
                {/* Header */}
                <div>
                    <Button variant="ghost" asChild className="mb-4">
                        <Link href="/admin/users">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Til baka
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Nýr notandi</h1>
                    <p className="text-zinc-600 mt-2">Búa til nýjan notanda (Create New User)</p>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notandaupplýsingar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createUser} className="space-y-6">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Fullt nafn *</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    required
                                    placeholder="t.d. Jón Jónsson"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Netfang *</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="jon@example.com"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Lykilorð *</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="Að minnsta kosti 6 stafir"
                                />
                                <p className="text-xs text-zinc-500">
                                    Notandinn getur breytt lykilorðinu síðar
                                </p>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Símanúmer</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="t.d. 555-1234"
                                />
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <Label htmlFor="role">Hlutverk *</Label>
                                <Select name="role" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Veldu hlutverk" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin - Stjórnandi</SelectItem>
                                        <SelectItem value="factory_manager">Factory Manager - Verkstjóri</SelectItem>
                                        <SelectItem value="buyer">Buyer - Kaupandi</SelectItem>
                                        <SelectItem value="driver">Driver - Bílstjóri</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Company (for buyers only) */}
                            <div className="space-y-2">
                                <Label htmlFor="company_id">
                                    Fyrirtæki
                                    <span className="text-zinc-500 text-sm ml-2">(Aðeins fyrir kaupendur)</span>
                                </Label>
                                <Select name="company_id">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Veldu fyrirtæki" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyList.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                {company.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                    Búa til notanda
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/admin/users">Hætta við</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
