import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export class AuthenticationRequiredError extends Error {
  status = 401;
  code = "authentication_required";

  constructor(
    message = "Sign in to your account before continuing.",
  ) {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireAuthenticatedUser() {
  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthenticationRequiredError();
  }

  return user;
}
