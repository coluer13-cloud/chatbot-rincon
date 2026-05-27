import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import { ReviewCard } from './ReviewCard'
import type { GbpReviewRow } from '@/types/app'

export const revalidate = 0

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user!.email!
  const supabase = createServerClient()

  const { data: reviews } = await supabase
    .from('gbp_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('create_time', { ascending: false })

  const unanswered = (reviews ?? []).filter((r: GbpReviewRow) => !r.reply_comment).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reseñas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{reviews?.length ?? 0} reseñas totales</p>
        </div>
        {unanswered > 0 && (
          <span className="rounded-full bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1">
            {unanswered} sin responder
          </span>
        )}
      </div>

      {!reviews?.length && (
        <div className="text-center py-16 text-gray-400">
          <p>No hay reseñas todavía.</p>
          <p className="text-sm mt-1">Sincroniza para cargar las reseñas de Google.</p>
        </div>
      )}

      <div className="space-y-4">
        {(reviews ?? []).map((review: GbpReviewRow) => (
          <ReviewCard key={review.review_id} review={review} />
        ))}
      </div>
    </div>
  )
}
