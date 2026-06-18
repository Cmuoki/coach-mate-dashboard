import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gumcjhwraiokxoomvbcx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bWNqaHdyYWlva3hvb212YmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUxNjEsImV4cCI6MjA5NjU2MTE2MX0.ALTbTQERXwuA5nW9WNiBoe6chFCAKnMpf2o0A0VAmSw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
