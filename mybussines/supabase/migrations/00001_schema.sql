-- mybussines: Google Business Profile SEO Manager
-- Schema v1

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- GBP configuration: stores account/location IDs discovered on first sync
CREATE TABLE IF NOT EXISTS gbp_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  account_id      TEXT NOT NULL,
  location_id     TEXT NOT NULL,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Business profile snapshot from GBP API
CREATE TABLE IF NOT EXISTS business_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL,
  name                  TEXT,
  primary_category      TEXT,
  additional_categories JSONB DEFAULT '[]',
  description           TEXT,
  short_description     TEXT,
  website_uri           TEXT,
  phone_numbers         JSONB DEFAULT '{}',
  address               JSONB DEFAULT '{}',
  latlng                JSONB DEFAULT '{}',
  regular_hours         JSONB DEFAULT '[]',
  special_hours         JSONB DEFAULT '[]',
  store_code            TEXT,
  open_info             JSONB DEFAULT '{}',
  labels                JSONB DEFAULT '[]',
  raw_snapshot          JSONB DEFAULT '{}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Photos / media items
CREATE TABLE IF NOT EXISTS gbp_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  media_item_id   TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'ADDITIONAL',
  google_url      TEXT NOT NULL,
  thumbnail_url   TEXT,
  description     TEXT,
  dimensions      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_item_id)
);

-- Google Posts (local posts)
CREATE TABLE IF NOT EXISTS gbp_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  post_id         TEXT NOT NULL,
  topic_type      TEXT NOT NULL DEFAULT 'STANDARD',
  language_code   TEXT NOT NULL DEFAULT 'es',
  summary         TEXT,
  call_to_action  JSONB DEFAULT '{}',
  event           JSONB DEFAULT '{}',
  offer           JSONB DEFAULT '{}',
  media           JSONB DEFAULT '[]',
  state           TEXT DEFAULT 'LIVE',
  create_time     TIMESTAMPTZ,
  update_time     TIMESTAMPTZ,
  UNIQUE(user_id, post_id)
);

-- Reviews
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  review_id       TEXT NOT NULL,
  reviewer        JSONB NOT NULL DEFAULT '{}',
  star_rating     TEXT NOT NULL,
  comment         TEXT,
  create_time     TIMESTAMPTZ,
  update_time     TIMESTAMPTZ,
  reply_comment   TEXT,
  reply_time      TIMESTAMPTZ,
  UNIQUE(user_id, review_id)
);

-- Q&A questions
CREATE TABLE IF NOT EXISTS gbp_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  question_id     TEXT NOT NULL,
  question_text   TEXT NOT NULL,
  author          JSONB DEFAULT '{}',
  create_time     TIMESTAMPTZ,
  upvote_count    INTEGER DEFAULT 0,
  answer_text     TEXT,
  answer_time     TIMESTAMPTZ,
  answer_author   JSONB DEFAULT '{}',
  UNIQUE(user_id, question_id)
);

-- Attributes
CREATE TABLE IF NOT EXISTS gbp_attributes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  attributes      JSONB NOT NULL DEFAULT '[]',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Products / Services
CREATE TABLE IF NOT EXISTS gbp_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  service_id      TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  price           JSONB DEFAULT '{}',
  is_offered      BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
