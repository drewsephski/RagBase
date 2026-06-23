import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { APP_PATH } from "@/lib/domain/site";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next") ?? APP_PATH;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(
        `${origin}${APP_PATH}?auth_error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : APP_PATH;

  return NextResponse.redirect(`${origin}${safeNext}`);
}
