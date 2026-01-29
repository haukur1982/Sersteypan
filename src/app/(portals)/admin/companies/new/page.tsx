import DashboardLayout from '@/components/layout/DashboardLayout'
import { CompanyForm } from '@/components/companies/CompanyForm'

export default function NewCompanyPage() {
    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Nýtt fyrirtæki</h1>
                    <p className="text-zinc-600 mt-2">Skrá nýjan viðskiptavin (Register new customer)</p>
                </div>

                <CompanyForm isEditing={false} />
            </div>
        </DashboardLayout>
    )
}
