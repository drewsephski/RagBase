import type { BillingWorkspace } from "@/lib/billing/types";
import { PRO_ACTIVE_STATUSES } from "@/lib/billing/types";
import { ProRequiredError } from "@/lib/billing/errors";

const PAST_DUE_GRACE_DAYS = 3;

function isPeriodValid(
  periodEnd: string | null,
  now: Date,
): boolean {
  if (!periodEnd) {
    return true;
  }
  return new Date(periodEnd) > now;
}

function isPastDueWithinGrace(
  pastDueAt: string | null,
  now: Date,
): boolean {
  if (!pastDueAt) {
    return false;
  }
  const graceEnd = new Date(pastDueAt);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + PAST_DUE_GRACE_DAYS);
  return now < graceEnd;
}

export function isProActive(
  workspace: BillingWorkspace,
  now: Date = new Date(),
): boolean {
  if (workspace.plan !== "pro") {
    return false;
  }

  const status = workspace.stripeSubscriptionStatus;
  if (!status) {
    return false;
  }

  if ((PRO_ACTIVE_STATUSES as readonly string[]).includes(status)) {
    return isPeriodValid(workspace.stripeCurrentPeriodEnd, now);
  }

  if (status === "past_due") {
    return isPastDueWithinGrace(workspace.stripePastDueAt, now);
  }

  return false;
}

export function requireProPlan(workspace: BillingWorkspace): void {
  if (!isProActive(workspace)) {
    throw new ProRequiredError();
  }
}
