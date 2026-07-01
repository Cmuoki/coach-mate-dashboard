import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Flame, Sparkles } from "lucide-react";
import chessKing from "@/assets/chess-king.jpg";
import chessBg from "@/assets/chess-bg.jpg.asset.json";
import chessKnight from "@/assets/chess-knight.jpg.asset.json";
import chessCrown from "@/assets/chess-crown.jpg.asset.json";
import chessRook from "@/assets/chess-rook.webp.asset.json";
import chessLineup from "@/assets/chess-lineup.webp.asset.json";
import chessFallen from "@/assets/chess-fallen.webp.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Rooky Coach" },
      { name: "description", content: "Sign in to your Rooky Coach console — manage schools, classes and students from one board." },
      { property: "og:title", content: "Rooky Coach — Sign in" },
      { property: "og:image", content: chessKing },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: chessKing },
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
        toast.success("Account created ♜ Redirecting…");
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient chess photo backdrop — matches dashboard */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <img src={chessBg.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/70 to-background/90" />
      </div>
      {/* Floating chess photo collage */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <img src={chessKnight.url} alt="" className="absolute top-16 -left-10 h-64 w-64 object-cover rounded-3xl opacity-40 blur-[1px] animate-float shadow-2xl" />
        <img src={chessCrown.url} alt="" className="absolute top-1/4 -right-12 h-72 w-72 object-cover rounded-3xl opacity-35 blur-[1px] animate-float-slow shadow-2xl" />
        <img src={chessRook.url} alt="" className="absolute top-[55%] left-[5%] h-56 w-56 object-cover rounded-3xl opacity-30 blur-[1px] animate-float-slow shadow-2xl" style={{ animationDelay: "1.2s" }} />
        <img src={chessLineup.url} alt="" className="absolute bottom-10 right-1/4 h-60 w-72 object-cover rounded-3xl opacity-30 blur-[1px] animate-float shadow-2xl" style={{ animationDelay: "2s" }} />
        <img src={chessFallen.url} alt="" className="absolute top-[45%] left-1/2 -translate-x-1/2 h-52 w-52 object-cover rounded-3xl opacity-25 blur-[2px] animate-float-slow shadow-2xl" style={{ animationDelay: "0.8s" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/70" />
      </div>

      {/* Header — same as dashboard */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-xl shadow-lg shadow-primary/30">
              ♜
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            </div>
            <div>
              <div className="font-bold tracking-tight leading-none group-hover:text-primary transition-colors">Rooky Coach</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">Coach console</div>
            </div>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back home
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 relative">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-stretch">
          {/* Left — hero card mirroring the dashboard hero */}
          <section className="relative overflow-hidden rounded-3xl border border-border/60 shimmer-border animate-pop-in min-h-[420px] hidden lg:flex">
            <img
              src={chessKing}
              alt="Chess king and knight on a wooden board"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/20" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            <div className="relative flex flex-col justify-between gap-6 p-10 w-full">
              <div className="space-y-4 max-w-md">
                <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/20 text-primary border-0 backdrop-blur">
                  <Flame className="h-3 w-3 mr-1" /> Welcome back
                </Badge>
                <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight">
                  Step onto the <span className="gradient-text">board.</span>
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Your console for schools, classes, lessons and every prodigy in formation —
                  built around the rook, your anchor piece.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md">
                {[
                  { k: "Coaches", v: "120+" },
                  { k: "Students", v: "3.4k" },
                  { k: "Schools", v: "28" },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl border border-border/60 bg-background/60 backdrop-blur p-3">
                    <div className="text-xl font-black gradient-text leading-none">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right — auth card */}
          <section className="relative">
            <div className="relative rounded-3xl border border-border/60 bg-background/70 backdrop-blur-xl shadow-2xl shadow-primary/10 p-6 sm:p-8 animate-pop-in">
              <div className="mb-6 space-y-1.5">
                <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/15 text-primary border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {mode === "signin" ? (
                    <>Welcome back, <span className="gradient-text">coach.</span></>
                  ) : (
                    <>Take the <span className="gradient-text">back rank.</span></>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Sign in to your fortress."
                    : "Create an account and start castling."}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full bg-background/60 border-border/60 backdrop-blur"
                onClick={handleGoogle}
                type="button"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 1.66 14.97.5 12 .5 7.31.5 3.26 3.19 1.28 7.07l3.66 2.84C5.86 7.07 8.7 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.42-1.11 2.62-2.36 3.43l3.62 2.81c2.11-1.95 3.77-4.83 3.77-8.48z" />
                  <path fill="#FBBC05" d="M4.94 14.09a7.13 7.13 0 0 1 0-4.18L1.28 7.07A11.5 11.5 0 0 0 .5 12c0 1.86.44 3.61 1.28 5.18l3.66-3.09z" />
                  <path fill="#34A853" d="M12 23.5c3.24 0 5.95-1.07 7.93-2.91l-3.62-2.81c-1.01.68-2.31 1.08-4.31 1.08-3.3 0-6.14-2.03-7.06-4.86l-3.66 3.09C3.26 20.81 7.31 23.5 12 23.5z" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-background/80 px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">or with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Coach" className="bg-background/60 backdrop-blur" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-background/60 backdrop-blur" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-background/60 backdrop-blur" />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full shadow-lg shadow-primary/30"
                  disabled={loading}
                >
                  {loading ? "Please wait…" : mode === "signin" ? "Enter the board" : "Create account"}
                </Button>
              </form>

              <p className="text-sm text-center text-muted-foreground mt-6">
                {mode === "signin" ? "New to Rooky Coach?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="text-primary font-semibold hover:underline"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
