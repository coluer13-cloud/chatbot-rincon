import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import { ProfileForm } from './ProfileForm'

export const revalidate = 0

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user!.email!
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('business_profile')
    .select('*')
    .eq('user_id', userId)
    .single()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perfil del negocio</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Edita la información de tu negocio en Google Business Profile
        </p>
      </div>

      {!profile ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p>Sin datos de perfil todavía.</p>
          <p className="text-sm mt-1">Sincroniza primero para cargar los datos desde Google Business.</p>
        </div>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </div>
  )
}
