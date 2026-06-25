import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import rookHero from "@/assets/rook-hero.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Rooky Coach" },
      { name: "description", content: "Sign in to coach your chess academy with Rooky Coach." },
      { property: "og:title", content: "Rooky Coach — Sign in" },
      { property: "og:image", content: rookHero.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: rookHero.url },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Redirecting…");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 text-slate-100">
      {/* Left — Rook stage */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(16,185,129,0.35), transparent 65%), radial-gradient(ellipse 50% 40% at 20% 90%, rgba(217,170,68,0.18), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 chess-board-bg opacity-[0.08]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 grid place-items-center overflow-hidden">
            <img src={rookHero.url} alt="" className="h-9 w-9 object-cover" />
          </div>
          <Link to="/" className="font-semibold tracking-tight text-lg hover:text-emerald-300 transition-colors">
            Rooky Coach
          </Link>
        </div>

        <div className="relative z-10 flex-1 grid place-items-center my-6">
          <div className="relative">
            <div className="absolute -inset-16 rounded-full bg-emerald-500/25 blur-[90px]" />
            <img
              src={rookHero.url}
              alt="The Rook"
              width={1024}
              height={1536}
              className="relative max-h-[520px] w-auto object-contain animate-float drop-shadow-[0_20px_60px_rgba(16,185,129,0.45)]"
            />
          </div>
        </div>

        <div className="relative z-10 space-y-3 max-w-md">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">The Rook</div>
          <h2 className="text-3xl font-semibold leading-tight">
            Steady. Powerful.{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent">
              The anchor of every game.
            </span>
          </h2>
          <p className="text-sm text-slate-300/90">
            Sign in to hold your back rank — students, classes and schools in perfect castling.
          </p>
        </div>
      </aside>

      {/* Right — Form */}
      <main className="relative flex items-center justify-center p-6 md:p-10">
        <div
          className="absolute inset-0 lg:hidden opacity-30"
          style={{
            backgroundImage: `url(${rookHero.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 lg:hidden bg-slate-950/80" />

        <div className="relative w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3 justify-center">
            <img src={rookHero.url} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-emerald-400/40" />
            <span className="text-xl font-semibold">Rooky Coach</span>
          </div>

          <div className="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 backdrop-blur p-7 shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "signin" ? "Welcome back, coach." : "Take the back rank."}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {mode === "signin"
                  ? "Sign in to your fortress."
                  : "Create an account and start castling."}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full bg-slate-950/40 border-slate-700 hover:bg-slate-800 text-slate-100"
              onClick={handleGoogle}
              type="button"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 1.66 14.97.5 12 .5 7.31.5 3.26 3.19 1.28 7.07l3.66 2.84C5.86 7.07 8.7 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.42-1.11 2.62-2.36 3.43l3.62 2.81c2.11-1.95 3.77-4.83 3.77-8.48z" />
                <path fill="#FBBC05" d="M4.94 14.09a7.13 7.13 0 0 1 0-4.18L1.28 7.07A11.5 11.5 0 0 0 .5 12c0 1.86.44 3.61 1.28 5.18l3.66-3.09z" />
                <path fill="#34A853" d="M12 23.5c3.24 0 5.95-1.07 7.93-2.91l-3.62-2.81c-1.01.68-2.31 1.08-4.31 1.08-3.3 0-6.14-2.03-7.06-4.86l-3.66 3.09C3.26 20.81 7.31 23.5 12 23.5z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900/60 px-2 text-slate-500 uppercase tracking-widest">or with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-300">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Coach" className="bg-slate-950/40 border-slate-700 text-slate-100 placeholder:text-slate-500" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-slate-950/40 border-slate-700 text-slate-100 placeholder:text-slate-500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-slate-950/40 border-slate-700 text-slate-100 placeholder:text-slate-500" />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_30px_-8px_rgba(16,185,129,0.6)]"
                disabled={loading}
              >
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="text-sm text-center text-slate-400 mt-5">
              {mode === "signin" ? "New to Rooky Coach?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-emerald-400 font-medium hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            <Link to="/" className="hover:text-slate-300">← Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
