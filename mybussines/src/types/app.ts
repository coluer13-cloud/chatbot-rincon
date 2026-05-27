export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface ScoreCheck {
  id: string
  label: string
  description: string
  maxPoints: number
  earnedPoints: number
  passed: boolean
  priority: Priority
  actionPath?: string
  actionLabel?: string
}

export interface ScoreCategory {
  id: string
  label: string
  emoji: string
  maxPoints: number
  earnedPoints: number
  checks: ScoreCheck[]
}

export interface Recommendation {
  id: string
  title: string
  description: string
  pointsGain: number
  priority: Priority
  actionPath: string
  actionLabel: string
}

export interface ScoreResult {
  totalScore: number
  maxScore: 100
  percentage: number
  categories: ScoreCategory[]
  recommendations: Recommendation[]
}

export interface BusinessProfileRow {
  id: string
  user_id: string
  name: string | null
  primary_category: string | null
  additional_categories: unknown[]
  description: string | null
  short_description: string | null
  website_uri: string | null
  phone_numbers: Record<string, unknown>
  address: Record<string, unknown>
  latlng: Record<string, unknown>
  regular_hours: unknown[]
  special_hours: unknown[]
  store_code: string | null
  open_info: Record<string, unknown>
  labels: unknown[]
  raw_snapshot: Record<string, unknown>
  updated_at: string
}

export interface GbpPhotoRow {
  id: string
  user_id: string
  media_item_id: string
  category: string
  google_url: string
  thumbnail_url: string | null
  description: string | null
  dimensions: Record<string, unknown>
  created_at: string
}

export interface GbpPostRow {
  id: string
  user_id: string
  post_id: string
  topic_type: string
  language_code: string
  summary: string | null
  call_to_action: Record<string, unknown>
  event: Record<string, unknown>
  offer: Record<string, unknown>
  media: unknown[]
  state: string
  create_time: string | null
  update_time: string | null
}

export interface GbpReviewRow {
  id: string
  user_id: string
  review_id: string
  reviewer: Record<string, unknown>
  star_rating: string
  comment: string | null
  create_time: string | null
  update_time: string | null
  reply_comment: string | null
  reply_time: string | null
}

export interface GbpQuestionRow {
  id: string
  user_id: string
  question_id: string
  question_text: string
  author: Record<string, unknown>
  create_time: string | null
  upvote_count: number
  answer_text: string | null
  answer_time: string | null
  answer_author: Record<string, unknown>
}

export interface GbpAttributeRow {
  id: string
  user_id: string
  attributes: unknown[]
  updated_at: string
}

export interface GbpServiceRow {
  id: string
  user_id: string
  service_id: string | null
  name: string
  description: string | null
  category: string | null
  price: Record<string, unknown>
  is_offered: boolean
  created_at: string
}

export interface GbpConfigRow {
  id: string
  user_id: string
  account_id: string
  location_id: string
  synced_at: string | null
  created_at: string
}
