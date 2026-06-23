import { listAccountWorkspaces } from "@/lib/workspace/account";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import { handleRouteError } from "@/lib/api/errors";

export async function GET(): Promise<Response> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaces = await listAccountWorkspaces();
    return Response.json({ workspaces });
  } catch (error) {
    return handleRouteError(error);
  }
}
