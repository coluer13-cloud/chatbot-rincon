import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createPost } from '@/lib/gbp/client'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const accessToken = session.access_token!

  const supabase = createServerClient()
  const { data: config } = await supabase
    .from('gbp_config')
    .select('location_id')
    .eq('user_id', session.user!.email!)
    .single()

  if (!config) return NextResponse.json({ error: 'Not configured' }, { status: 400 })

  const result = await createPost(config.location_id, body, accessToken)
  return NextResponse.json(result)
}
