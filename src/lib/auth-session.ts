import { supabase } from "@/integrations/supabase/client";

function isInvalidStoredSession(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /invalid refresh token|refresh token not found|refresh_token_not_found/i.test(message);
}

export async function clearLocalAuthSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Local cleanup should never block a fresh sign-in attempt.
  }
}

export async function getCurrentSessionSafely() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isInvalidStoredSession(error)) await clearLocalAuthSession();
      return null;
    }
    return data.session ?? null;
  } catch (error) {
    if (isInvalidStoredSession(error)) await clearLocalAuthSession();
    return null;
  }
}

export async function getCurrentUserSafely() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isInvalidStoredSession(error)) await clearLocalAuthSession();
      return null;
    }
    return data.user ?? null;
  } catch (error) {
    if (isInvalidStoredSession(error)) await clearLocalAuthSession();
    return null;
  }
}