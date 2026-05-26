import { createServerClient } from '@/lib/supabase/server'
import {
  listAccounts,
  listLocations,
  getLocation,
  listReviews,
  listPosts,
  listPhotos,
  listAttributes,
  listQuestions,
} from './client'

export async function syncGbp(userId: string, accessToken: string) {
  const supabase = createServerClient()

  let { data: config } = await supabase
    .from('gbp_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!config) {
    const accounts = await listAccounts(accessToken)
    if (!accounts.length) throw new Error('No Google Business accounts found')
    const accountId = accounts[0].name

    const locations = await listLocations(accountId, accessToken)
    if (!locations.length) throw new Error('No locations found')
    const locationId = locations[0].name

    const { data: newConfig } = await supabase
      .from('gbp_config')
      .insert({ user_id: userId, account_id: accountId, location_id: locationId })
      .select()
      .single()
    config = newConfig
  }

  const { account_id, location_id } = config!

  const [location, reviews, posts, photos, attributesData, questions] =
    await Promise.allSettled([
      getLocation(location_id, accessToken),
      listReviews(location_id, accessToken),
      listPosts(location_id, accessToken),
      listPhotos(location_id, accessToken),
      listAttributes(location_id, accessToken),
      listQuestions(location_id, accessToken),
    ])

  if (location.status === 'fulfilled') {
    const loc = location.value
    await supabase.from('business_profile').upsert({
      user_id: userId,
      name: loc.title ?? null,
      primary_category: loc.categories?.primaryCategory?.name ?? null,
      additional_categories: loc.categories?.additionalCategories ?? [],
      description: loc.profile?.description ?? null,
      website_uri: loc.websiteUri ?? null,
      phone_numbers: loc.phoneNumbers ?? {},
      address: loc.storefrontAddress ?? {},
      latlng: loc.latlng ?? {},
      regular_hours: loc.regularHours?.periods ?? [],
      special_hours: loc.specialHours?.specialHourPeriods ?? [],
      open_info: loc.openInfo ?? {},
      labels: loc.labels ?? [],
      raw_snapshot: loc,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (reviews.status === 'fulfilled' && reviews.value.length) {
    const rows = reviews.value.map((r: Record<string, unknown>) => ({
      user_id: userId,
      review_id: r.name,
      reviewer: r.reviewer ?? {},
      star_rating: r.starRating,
      comment: r.comment ?? null,
      create_time: r.createTime ?? null,
      update_time: r.updateTime ?? null,
      reply_comment: (r.reviewReply as Record<string, unknown>)?.comment ?? null,
      reply_time: (r.reviewReply as Record<string, unknown>)?.updateTime ?? null,
    }))
    await supabase.from('gbp_reviews').upsert(rows, { onConflict: 'user_id,review_id' })
  }

  if (posts.status === 'fulfilled' && posts.value.length) {
    const rows = posts.value.map((p: Record<string, unknown>) => ({
      user_id: userId,
      post_id: p.name,
      topic_type: p.topicType,
      language_code: p.languageCode ?? 'es',
      summary: p.summary ?? null,
      call_to_action: p.callToAction ?? {},
      event: p.event ?? {},
      offer: p.offer ?? {},
      media: p.media ?? [],
      state: p.state ?? 'LIVE',
      create_time: p.createTime ?? null,
      update_time: p.updateTime ?? null,
    }))
    await supabase.from('gbp_posts').upsert(rows, { onConflict: 'user_id,post_id' })
  }

  if (photos.status === 'fulfilled' && photos.value.length) {
    const rows = photos.value.map((m: Record<string, unknown>) => ({
      user_id: userId,
      media_item_id: m.name,
      category: (m.locationAssociation as Record<string, unknown>)?.category ?? 'ADDITIONAL',
      google_url: m.googleUrl,
      thumbnail_url: m.thumbnailUrl ?? null,
      description: m.description ?? null,
      dimensions: m.dimensions ?? {},
      created_at: m.createTime ?? new Date().toISOString(),
    }))
    await supabase.from('gbp_photos').upsert(rows, { onConflict: 'user_id,media_item_id' })
  }

  if (attributesData.status === 'fulfilled') {
    await supabase.from('gbp_attributes').upsert({
      user_id: userId,
      attributes: attributesData.value.attributes ?? [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (questions.status === 'fulfilled' && questions.value.length) {
    const rows = questions.value.map((q: Record<string, unknown>) => {
      const topAnswer = (q.topAnswers as Record<string, unknown>[])?.[0]
      return {
        user_id: userId,
        question_id: q.name,
        question_text: q.text,
        author: q.author ?? {},
        create_time: q.createTime ?? null,
        upvote_count: q.upvoteCount ?? 0,
        answer_text: topAnswer?.text ?? null,
        answer_time: topAnswer?.updateTime ?? null,
        answer_author: topAnswer?.author ?? {},
      }
    })
    await supabase.from('gbp_questions').upsert(rows, { onConflict: 'user_id,question_id' })
  }

  await supabase
    .from('gbp_config')
    .update({ synced_at: new Date().toISOString() })
    .eq('user_id', userId)

  return {
    accountId: account_id,
    locationId: location_id,
    synced_at: new Date().toISOString(),
  }
}
