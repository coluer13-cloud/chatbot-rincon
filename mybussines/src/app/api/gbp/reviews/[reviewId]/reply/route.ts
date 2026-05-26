import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { replyToReview } from '@/lib/gbp/client'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { comment } = await req.json()
  const { reviewId } = await params
  const accessToken = session.access_token!

  const supabase = createServerClient()
  const { data: config } = await supabase
    .from('gbp_config')
    .select('location_id')
    .eq('user_id', session.user!.email!)
    .single()

  if (!config) return NextResponse.json({ error: 'Not configured' }, { status: 400 })

  const reviewName = `${config.location_id}/reviews/${reviewId}`
  const result = await replyToReview(reviewName, comment, accessToken)

  await supabase
    .from('gbp_reviews')
    .update({ reply_comment: comment, reply_time: new Date().toISOString() })
    .eq('user_id', session.user!.email!)
    .eq('review_id', reviewName)

  return NextResponse.json(result)
}
