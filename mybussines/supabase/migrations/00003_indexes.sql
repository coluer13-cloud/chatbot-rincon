-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gbp_photos_user     ON gbp_photos   (user_id, category);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_user      ON gbp_posts    (user_id, create_time DESC);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_user    ON gbp_reviews  (user_id, create_time DESC);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_noreply ON gbp_reviews  (user_id, reply_comment)
  WHERE reply_comment IS NULL;
CREATE INDEX IF NOT EXISTS idx_gbp_questions_user  ON gbp_questions(user_id, upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_gbp_services_user   ON gbp_services (user_id);
