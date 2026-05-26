import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { updateLocation } from '@/lib/gbp/client'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, websiteUri } = await req.json()
  const accessToken = session.access_token!
  const userId = session.user!.email!

  const supabase = createServerClient()
  const { data: config } = await supabase
    .from('gbp_config')
    .select('location_id')
    .eq('user_id', userId)
    .single()

  if (!config) return NextResponse.json({ error: 'Not configured' }, { status: 400 })

  const fields: Record<string, unknown> = {}
  const maskParts: string[] = []

  if (name !== undefined) { fields.title = name; maskParts.push('title') }
  if (description !== undefined) { fields.profile = { description }; maskParts.push('profile.description') }
  if (websiteUri !== undefined) { fields.websiteUri = websiteUri; maskParts.push('websiteUri') }

  if (!maskParts.length) return NextResponse.json({ ok: true })

  const result = await updateLocation(config.location_id, maskParts.join(','), fields, accessToken)

  await supabase.from('business_profile').update({
    name: name ?? undefined,
    description: description ?? undefined,
    website_uri: websiteUri ?? undefined,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return NextResponse.json(result)
}
