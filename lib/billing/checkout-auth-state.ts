export type CheckoutAuthStatus = "ready" | "checking" | "sign_in_required";

export interface CheckoutAuthState {
  status: CheckoutAuthStatus;
  canCheckout: boolean;
  statusMessage: string | null;
}

interface CheckoutAuthInput {
  isAuthConfigured: boolean;
  isLoading?: boolean;
  hasUser?: boolean;
}

export function getCheckoutAuthState(input: CheckoutAuthInput): CheckoutAuthState {
  if (!input.isAuthConfigured) {
    return {
      status: "ready",
      canCheckout: true,
      statusMessage: null,
    };
  }

  if (input.isLoading ?? true) {
    return {
      status: "checking",
      canCheckout: false,
      statusMessage: "Checking account…",
    };
  }

  if (!input.hasUser) {
    return {
      status: "sign_in_required",
      canCheckout: false,
      statusMessage: "Sign in to subscribe — your Pro plan stays linked to your account.",
    };
  }

  return {
    status: "ready",
    canCheckout: true,
    statusMessage: null,
  };
}
