import { getCompany } from '@/lib/companies/actions'
import { CompanyForm } from '@/components/companies/CompanyForm'

interface EditCompanyPageProps {
    params: Promise<{
        companyId: string
    }>
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
    // Next.js 16: params is now a Promise and must be awaited
    const { companyId } = await params
    const { data: company, error } = await getCompany(companyId)

    if (error || !company) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Villa</h1>
                <p className="text-zinc-600">Ekki tókst að finna fyrirtæki eða villa kom upp.</p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Breyta fyrirtæki</h1>
                <p className="text-zinc-600 mt-2">Uppfæra upplýsingar um {company.name}</p>
            </div>

            <CompanyForm initialData={company} isEditing={true} />
        </div>
    )
}
