export function formatBillingPeriodEnd(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
