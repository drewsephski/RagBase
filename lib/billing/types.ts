export const PRO_ACTIVE_STATUSES = ["active", "trialing"] as const;

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | string;

export interface BillingWorkspace {
  id: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: StripeSubscriptionStatus | null;
  stripeCurrentPeriodStart: string | null;
  stripeCurrentPeriodEnd: string | null;
  proActivatedAt: string | null;
  stripePastDueAt: string | null;
  recoveryAcknowledgedAt: string | null;
  crawlCountPeriod: number;
  crawledPagesPeriod: number;
  crawlPeriodStart: string | null;
}

export interface SubscriptionStatusResponse {
  plan: string;
  isProActive: boolean;
  stripeSubscriptionStatus: StripeSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  recoveryLinkConfirmed: boolean;
  crawlQuota?: {
    crawlsUsed: number;
    crawlsLimit: number;
    pagesUsed: number;
    pagesLimit: number;
  };
}

export interface WorkspaceBillingRow {
  id: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_current_period_start: string | null;
  stripe_current_period_end: string | null;
  pro_activated_at: string | null;
  stripe_past_due_at: string | null;
  recovery_acknowledged_at: string | null;
  crawl_count_period: number;
  crawled_pages_period: number;
  crawl_period_start: string | null;
}

export const WORKSPACE_BILLING_COLUMNS =
  "id, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_start, stripe_current_period_end, pro_activated_at, stripe_past_due_at, recovery_acknowledged_at, crawl_count_period, crawled_pages_period, crawl_period_start";

export function mapBillingRow(row: WorkspaceBillingRow): BillingWorkspace {
  return {
    id: row.id,
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeSubscriptionStatus: row.stripe_subscription_status,
    stripeCurrentPeriodStart: row.stripe_current_period_start,
    stripeCurrentPeriodEnd: row.stripe_current_period_end,
    proActivatedAt: row.pro_activated_at,
    stripePastDueAt: row.stripe_past_due_at,
    recoveryAcknowledgedAt: row.recovery_acknowledged_at,
    crawlCountPeriod: row.crawl_count_period,
    crawledPagesPeriod: row.crawled_pages_period,
    crawlPeriodStart: row.crawl_period_start,
  };
}
