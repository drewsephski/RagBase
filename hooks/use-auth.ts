"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";
import { APP_PATH } from "@/lib/domain/site";

export interface UseAuthState {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseAuthConfigured());
  const isConfigured = isSupabaseAuthConfigured();

  const supabase = useMemo(() => {
    if (!isConfigured) {
      return null;
    }
    return createBrowserSupabaseClient();
  }, [isConfigured]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      const client = supabase;
      if (!client) {
        return;
      }

      const { data } = await client.auth.getUser();
      if (!cancelled) {
        setUser(data.user ?? null);
        setIsLoading(false);
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) {
        throw new Error("Account sign-in is not configured.");
      }

      const trimmed = email.trim();
      if (!trimmed) {
        throw new Error("Email is required.");
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(APP_PATH)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setUser(null);
  }, [supabase]);

  return {
    user,
    isLoading,
    isConfigured,
    signInWithEmail,
    signOut,
  };
}
