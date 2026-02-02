import { notFound } from 'next/navigation'
import { getUser, updateUser, deactivateUser } from '@/lib/users/actions'
import { getCompanies } from '@/lib/companies/actions'
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

interface EditUserPageProps {
    params: Promise<{
        userId: string
    }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
    const { userId } = await params

    // Fetch user data
    const { data: user, error: userError } = await getUser(userId)

    if (userError || !user) {
        return notFound()
    }

    // Fetch companies for buyer role assignment
    const { data: companies } = await getCompanies()
    const companyList = (companies ?? []) as CompanyRow[]

    return (
        <div className="space-y-6 max-w-2xl">
                {/* Header */}
                <div>
                    <Button variant="ghost" asChild className="mb-4">
                        <Link href="/admin/users">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Til baka
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                        Breyta notanda
                    </h1>
                    <p className="text-zinc-600 mt-2">{user.full_name}</p>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notandaupplýsingar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData: FormData) => {
                            'use server'
                            await updateUser(userId, formData)
                        }} className="space-y-6">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Fullt nafn *</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    required
                                    defaultValue={user.full_name}
                                    placeholder="t.d. Jón Jónsson"
                                />
                            </div>

                            {/* Email (read-only) */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Netfang</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="bg-zinc-50"
                                />
                                <p className="text-xs text-zinc-500">
                                    Ekki er hægt að breyta netfangi
                                </p>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Símanúmer</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    defaultValue={user.phone || ''}
                                    placeholder="t.d. 555-1234"
                                />
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <Label htmlFor="role">Hlutverk *</Label>
                                <Select name="role" required defaultValue={user.role}>
                                    <SelectTrigger>
                                        <SelectValue />
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
                                <Select name="company_id" defaultValue={user.company_id || ''}>
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

                            {/* Status */}
                            <div className="space-y-2">
                                <Label htmlFor="is_active">Staða</Label>
                                <Select name="is_active" required defaultValue={user.is_active ? 'true' : 'false'}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Virkur (Active)</SelectItem>
                                        <SelectItem value="false">Óvirkur (Inactive)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                    Vista breytingar
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/admin/users">Hætta við</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-900">Hættulegt svæði</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={async () => {
                            'use server'
                            await deactivateUser(userId)
                        }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-zinc-900">Gera notanda óvirkan</p>
                                    <p className="text-sm text-zinc-600 mt-1">
                                        Notandinn mun ekki geta skráð sig inn
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={!user.is_active}
                                >
                                    Gera óvirkan
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
    )
}
