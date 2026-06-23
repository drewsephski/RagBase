export const ANALYTICS_EVENTS = [
  "workspace_created",
  "file_uploaded",
  "url_ingested",
  "ingestion_failed",
  "first_message_sent",
  "answer_started",
  "answer_completed",
  "answer_failed",
  "starter_prompt_clicked",
  "citation_clicked",
  "source_opened",
  "copy_answer_clicked",
  "answer_feedback_submitted",
  "prompt_deeplink_opened",
  "prompt_link_copied",
  "openrouter_key_added",
  "paid_feature_clicked",
  "paid_intent",
  "workspace_deleted",
  "paywall_viewed",
  "paywall_primary_clicked",
  "paywall_waitlist_submitted",
  "ocr_attempted",
  "ocr_completed",
  "ocr_failed",
  "recovery_link_generated",
  "recovery_link_used",
  "checkout_success_pending",
  "checkout_success_resolved",
  "recovery_link_confirmed",
  "recovery_link_deferred",
  "billing_portal_opened",
  "billing_portal_failed",
  "checkout_session_created",
  "checkout_session_failed",
  "checkout_confirmed",
  "paywall_subscribe_clicked",
  "crawl_started",
  "crawl_canceled",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const PAID_INTENT_FEATURES = [
  "full_site_crawl",
  "ocr",
  "larger_limits",
  "cross_device_workspace",
] as const;

export type PaidIntentFeature = (typeof PAID_INTENT_FEATURES)[number];

export type AnalyticsProperties = Record<string, string | number | boolean>;

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
  timestamp: number;
  anonymousId?: string;
}
