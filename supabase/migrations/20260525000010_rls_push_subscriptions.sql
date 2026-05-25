-- RLS for push_subscriptions: each restaurant only sees its own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own_restaurant"
  ON push_subscriptions
  FOR ALL
  USING (
    restaurant_id = (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id = (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );
