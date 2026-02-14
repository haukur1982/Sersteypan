import { getServerUser } from '@/lib/auth/getServerUser'
import { createClient } from '@/lib/supabase/server'
import { User, Building2, Mail, Phone, Shield } from 'lucide-react'
import { ProfileForm } from '@/components/buyer/ProfileForm'

export default async function ProfilePage() {
  const user = await getServerUser()

  // Get company info
  const supabase = await createClient()
  let company = null

  // Get current phone from profile
  let phone = ''
  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single()
    phone = profile?.phone || ''
  }

  if (user?.companyId) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.companyId)
      .single()

    company = data
  }

  const roleLabels: Record<string, string> = {
    admin: 'Stjórnandi',
    factory_manager: 'Framleiðslustjóri',
    buyer: 'Kaupandi',
    driver: 'Bílstjóri'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Mínar upplýsingar</h1>
          <p className="text-zinc-600 mt-1">Notendaupplýsingar og fyrirtæki</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info — Editable */}
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Notandaupplýsingar
            </h2>

            <div className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <label className="text-sm text-zinc-500 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Netfang
                </label>
                <p className="font-medium text-zinc-900 mt-1">{user?.email}</p>
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="text-sm text-zinc-500 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Hlutverk
                </label>
                <p className="font-medium text-zinc-900 mt-1">
                  {user?.role ? (roleLabels[user.role] || user.role) : ''}
                </p>
              </div>

              {/* Editable fields */}
              <div className="pt-4 border-t border-zinc-200">
                <ProfileForm
                  initialName={user?.fullName || ''}
                  initialPhone={phone}
                />
              </div>
            </div>
          </div>

          {/* Company Info (read-only) */}
          {company && (
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Fyrirtæki
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-500">Nafn</label>
                  <p className="font-medium text-zinc-900 mt-1">{company.name}</p>
                </div>

                {company.kennitala && (
                  <div>
                    <label className="text-sm text-zinc-500">Kennitala</label>
                    <p className="font-medium text-zinc-900 mt-1">
                      {company.kennitala}
                    </p>
                  </div>
                )}

                {company.address && (
                  <div>
                    <label className="text-sm text-zinc-500">Heimilisfang</label>
                    <p className="font-medium text-zinc-900 mt-1">
                      {company.address}
                    </p>
                    {company.city && company.postal_code && (
                      <p className="font-medium text-zinc-900">
                        {company.postal_code} {company.city}
                      </p>
                    )}
                  </div>
                )}

                {company.contact_name && (
                  <div>
                    <label className="text-sm text-zinc-500">Tengiliður</label>
                    <p className="font-medium text-zinc-900 mt-1">
                      {company.contact_name}
                    </p>
                    {company.contact_email && (
                      <p className="text-sm text-zinc-600 mt-1 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {company.contact_email}
                      </p>
                    )}
                    {company.contact_phone && (
                      <p className="text-sm text-zinc-600 mt-1 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {company.contact_phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-sm text-zinc-700">
          <p className="font-medium mb-1">Athugasemd</p>
          <p>
            Netfang, hlutverk og fyrirtækjaupplýsingar eru aðeins breytt af stjórnanda kerfisins.
            Hér getur þú breytt nafni og símanúmeri.
          </p>
        </div>
      </div>
  )
}
