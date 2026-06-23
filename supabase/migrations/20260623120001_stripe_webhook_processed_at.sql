-- Stripe webhook idempotency: only mark events processed after handler success.
-- Rows with processed_at IS NULL represent in-flight or failed attempts that
-- Stripe may retry.

alter table public.stripe_webhook_events
  alter column processed_at drop default,
  alter column processed_at drop not null;
