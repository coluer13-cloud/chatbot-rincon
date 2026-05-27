-- Row Level Security policies
-- All tables use TEXT user_id (email from NextAuth) for simplicity
-- This app does not use Supabase Auth — all server-side access uses service_role key

-- Enable RLS on all tables (protects against accidental anon access)
ALTER TABLE gbp_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_attributes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_services     ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated policies — all access goes through service_role key
-- which bypasses RLS entirely. This is safe because the API routes authenticate
-- via NextAuth before touching Supabase.
