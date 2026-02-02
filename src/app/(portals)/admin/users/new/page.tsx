import { getCompanies } from '@/lib/companies/actions'
import { UserForm } from '@/components/users/UserForm'
import type { Database } from '@/types/database'

type CompanyRow = Database['public']['Tables']['companies']['Row']

export default async function NewUserPage() {
    // Fetch companies for buyer role assignment
    const { data: companies } = await getCompanies()
    const companyList = (companies ?? []) as CompanyRow[]

    return <UserForm companies={companyList} />
}

