import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import { calculateScore } from '@/lib/gbp/score'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user!.email!
  const supabase = createServerClient()

  const [profile, photos, posts, reviews, questions, services, attributes] =
    await Promise.all([
      supabase.from('business_profile').select('*').eq('user_id', userId).single(),
      supabase.from('gbp_photos').select('*').eq('user_id', userId),
      supabase.from('gbp_posts').select('*').eq('user_id', userId),
      supabase.from('gbp_reviews').select('*').eq('user_id', userId),
      supabase.from('gbp_questions').select('*').eq('user_id', userId),
      supabase.from('gbp_services').select('*').eq('user_id', userId),
      supabase.from('gbp_attributes').select('*').eq('user_id', userId).single(),
    ])

  const result = calculateScore({
    profile: profile.data,
    photos: photos.data ?? [],
    posts: posts.data ?? [],
    reviews: reviews.data ?? [],
    questions: questions.data ?? [],
    services: services.data ?? [],
    attributes: attributes.data,
  })

  return NextResponse.json(result)
}
