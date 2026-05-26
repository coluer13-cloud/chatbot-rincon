import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import type { GbpPhotoRow } from '@/types/app'
import Image from 'next/image'

export const revalidate = 0

const CATEGORIES = [
  { id: 'ALL', label: 'Todas' },
  { id: 'COVER', label: 'Portada' },
  { id: 'LOGO', label: 'Logo' },
  { id: 'PROFILE', label: 'Perfil' },
  { id: 'INTERIOR', label: 'Interior' },
  { id: 'EXTERIOR', label: 'Exterior' },
  { id: 'PRODUCT', label: 'Productos' },
  { id: 'TEAMS', label: 'Equipo' },
  { id: 'AT_WORK', label: 'En acción' },
  { id: 'FOOD_AND_DRINK', label: 'Comida y bebida' },
  { id: 'ADDITIONAL', label: 'Otras' },
]

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = session!.user!.email!
  const supabase = createServerClient()
  const { cat = 'ALL' } = await searchParams

  let query = supabase.from('gbp_photos').select('*').eq('user_id', userId)
  if (cat !== 'ALL') query = query.eq('category', cat)
  const { data: photos } = await query.order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fotos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{photos?.length ?? 0} fotos</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(c => (
          <a
            key={c.id}
            href={`/dashboard/photos?cat=${c.id}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              cat === c.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </a>
        ))}
      </div>

      {!photos?.length && (
        <div className="text-center py-16 text-gray-400">
          <p>No hay fotos en esta categoría.</p>
          <p className="text-sm mt-1">Sincroniza para cargar las fotos de Google Business.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {(photos ?? []).map((photo: GbpPhotoRow) => (
          <div key={photo.media_item_id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={photo.google_url}
              alt={photo.description ?? photo.category}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <span className="absolute bottom-2 left-2 rounded bg-black/60 text-white text-xs px-1.5 py-0.5">
              {photo.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
