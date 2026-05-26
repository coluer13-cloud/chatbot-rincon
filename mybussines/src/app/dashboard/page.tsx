import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import { calculateScore } from '@/lib/gbp/score'
import { ScoreRing } from '@/components/score/ScoreRing'
import { RecommendationList } from '@/components/score/RecommendationList'
import { SyncButton } from './SyncButton'
import { timeAgo } from '@/lib/utils'

export const revalidate = 0

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user!.email!
  const supabase = createServerClient()

  const [
    { data: config },
    { data: profile },
    { data: photos },
    { data: posts },
    { data: reviews },
    { data: questions },
    { data: services },
    { data: attributes },
  ] = await Promise.all([
    supabase.from('gbp_config').select('*').eq('user_id', userId).single(),
    supabase.from('business_profile').select('*').eq('user_id', userId).single(),
    supabase.from('gbp_photos').select('*').eq('user_id', userId),
    supabase.from('gbp_posts').select('*').eq('user_id', userId),
    supabase.from('gbp_reviews').select('*').eq('user_id', userId),
    supabase.from('gbp_questions').select('*').eq('user_id', userId),
    supabase.from('gbp_services').select('*').eq('user_id', userId),
    supabase.from('gbp_attributes').select('*').eq('user_id', userId).single(),
  ])

  const score = calculateScore({
    profile,
    photos: photos ?? [],
    posts: posts ?? [],
    reviews: reviews ?? [],
    questions: questions ?? [],
    services: services ?? [],
    attributes,
  })

  const syncedAt = config?.synced_at ?? null
  const unansweredReviews = (reviews ?? []).filter(r => !r.reply_comment).length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.name ?? 'Mi negocio'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {syncedAt ? `Última sincronización ${timeAgo(syncedAt)}` : 'Sin sincronizar aún'}
          </p>
        </div>
        <SyncButton />
      </div>

      {!config && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Conecta tu cuenta de Google Business pulsando <strong>Sincronizar ahora</strong> para comenzar.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6 flex flex-col items-center">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Optimización SEO
            </h2>
            <ScoreRing score={score.totalScore} />
            <p className="mt-4 text-sm text-gray-600 text-center">
              {score.totalScore === 100
                ? '¡Perfil completamente optimizado!'
                : `Faltan ${100 - score.totalScore} puntos para el 100%`}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{(reviews ?? []).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Reseñas totales</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{unansweredReviews}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sin responder</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{(posts ?? []).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Posts activos</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{(photos ?? []).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Fotos</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Categorías del score</h2>
            <div className="space-y-3">
              {score.categories.map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="text-xs text-gray-400">{cat.earnedPoints}/{cat.maxPoints}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(cat.earnedPoints / cat.maxPoints) * 100}%`,
                        backgroundColor: cat.earnedPoints === cat.maxPoints ? '#22c55e' : '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Acciones recomendadas
            </h2>
            <RecommendationList recommendations={score.recommendations} limit={6} />
          </div>
        </div>
      </div>
    </div>
  )
}
