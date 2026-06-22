-- Waitlist signups (Pro feature interest). Service role access only.
CREATE TABLE IF NOT EXISTS waitlist_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  feature text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'paywall_dialog',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_emails_email_feature_idx
  ON waitlist_emails (email, feature);

CREATE INDEX IF NOT EXISTS waitlist_emails_feature_created_at_idx
  ON waitlist_emails (feature, created_at DESC);
