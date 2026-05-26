const GBP_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const GBP_ACCOUNT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const GBP_V4_BASE = 'https://mybusiness.googleapis.com/v4'
const GBP_QA_BASE = 'https://mybusinessqanda.googleapis.com/v1'

async function gbpFetch(
  url: string,
  accessToken: string,
  options?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (res.status === 401) throw new Error('GBP_UNAUTHORIZED')
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GBP_API_ERROR:${res.status}:${body}`)
  }
  return res
}

export async function listAccounts(accessToken: string) {
  const res = await gbpFetch(
    `${GBP_ACCOUNT_BASE}/accounts`,
    accessToken,
  )
  const data = await res.json()
  return data.accounts ?? []
}

export async function listLocations(accountId: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_INFO_BASE}/${accountId}/locations?readMask=name,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,profile,openInfo,metadata,latlng,labels`,
    accessToken,
  )
  const data = await res.json()
  return data.locations ?? []
}

export async function getLocation(locationName: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_INFO_BASE}/${locationName}?readMask=name,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,profile,openInfo,metadata,latlng,labels`,
    accessToken,
  )
  return res.json()
}

export async function updateLocation(
  locationName: string,
  updateMask: string,
  body: Record<string, unknown>,
  accessToken: string,
) {
  const res = await gbpFetch(
    `${GBP_INFO_BASE}/${locationName}?updateMask=${updateMask}`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.json()
}

export async function listReviews(locationName: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_V4_BASE}/${locationName}/reviews?pageSize=50`,
    accessToken,
  )
  const data = await res.json()
  return data.reviews ?? []
}

export async function replyToReview(
  reviewName: string,
  comment: string,
  accessToken: string,
) {
  const res = await gbpFetch(`${GBP_V4_BASE}/${reviewName}/reply`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ comment }),
  })
  return res.json()
}

export async function listPosts(locationName: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_V4_BASE}/${locationName}/localPosts?pageSize=20`,
    accessToken,
  )
  const data = await res.json()
  return data.localPosts ?? []
}

export async function createPost(
  locationName: string,
  body: Record<string, unknown>,
  accessToken: string,
) {
  const res = await gbpFetch(
    `${GBP_V4_BASE}/${locationName}/localPosts`,
    accessToken,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.json()
}

export async function deletePost(postName: string, accessToken: string) {
  await gbpFetch(`${GBP_V4_BASE}/${postName}`, accessToken, { method: 'DELETE' })
}

export async function listPhotos(locationName: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_V4_BASE}/${locationName}/media?pageSize=100`,
    accessToken,
  )
  const data = await res.json()
  return data.mediaItems ?? []
}

export async function deletePhoto(mediaName: string, accessToken: string) {
  await gbpFetch(`${GBP_V4_BASE}/${mediaName}`, accessToken, { method: 'DELETE' })
}

export async function listAttributes(locationName: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_INFO_BASE}/${locationName}/attributes`,
    accessToken,
  )
  return res.json()
}

export async function updateAttributes(
  locationName: string,
  attributes: unknown[],
  accessToken: string,
) {
  const res = await gbpFetch(
    `${GBP_INFO_BASE}/${locationName}/attributes`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify({ attributes }) },
  )
  return res.json()
}

export async function listQuestions(locationName: string, accessToken: string) {
  const res = await gbpFetch(
    `${GBP_QA_BASE}/${locationName}/questions?pageSize=20&answersPerQuestion=1`,
    accessToken,
  )
  const data = await res.json()
  return data.questions ?? []
}
