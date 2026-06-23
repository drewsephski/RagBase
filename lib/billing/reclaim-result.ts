export interface ReclaimSubscriptionResult {
  reclaimed: boolean;
  error?: {
    message: string;
    code: string;
  };
}

export function getReclaimErrorMessage(code: string, fallbackMessage: string): string {
  switch (code) {
    case "subscription_linked_elsewhere":
      return "Your RagBase Pro subscription is linked to another workspace. Switch to that workspace or use Manage billing before attaching Pro here.";
    case "stripe_customer_missing":
      return "We found a Pro subscription but could not connect it to this workspace. Use Manage billing or contact support.";
    case "rate_limit":
      return fallbackMessage;
    default:
      return fallbackMessage;
  }
}
