import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Sparkles, ArrowRight } from "lucide-react";
import chessKing from "@/assets/chess-king.jpg";
import chessBg from "@/assets/chess-bg.jpg.asset.json";
import chessKnight from "@/assets/chess-knight.jpg.asset.json";
import chessCrown from "@/assets/chess-crown.jpg.asset.json";
import chessRook from "@/assets/chess-rook.webp.asset.json";
import chessLineup from "@/assets/chess-lineup.webp.asset.json";
import chessFallen from "@/assets/chess-fallen.webp.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rooky Coach · Coach chess like a fortress" },
      { name: "description", content: "Rooky Coach is the console for chess coaches — schools, classes, students and progress, held in formation around the rook." },
      { property: "og:title", content: "Rooky Coach" },
      { property: "og:description", content: "Coach chess like a fortress. Built around the rook." },
      { property: "og:image", content: chessKing },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: chessKing },
    ],
  }),
  component: SplashLanding,
});

function SplashLanding() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard" });
      } else {
        setReady(true);
      }
    });
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen relative overflow-hidden grid place-items-center">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
          <img src={chessBg.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/70 to-background/90" />
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-5xl shadow-2xl shadow-primary/40 animate-float">
            ♞
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs tracking-[0.4em] uppercase text-primary/80">
            <span className="h-px w-8 bg-primary/60" />
            Rooky Coach
            <span className="h-px w-8 bg-primary/60" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient chess photo backdrop — matches dashboard */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <img src={chessBg.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/70 to-background/90" />
      </div>
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
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-xl shadow-lg shadow-primary/30">
              ♞
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            </div>
            <div>
              <div className="font-bold tracking-tight leading-none">Rooky Coach</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">Coach console</div>
            </div>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="shadow-lg shadow-primary/30">
              <Link to="/auth">Get started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 space-y-10 relative">
        {/* Hero — mirrors dashboard hero card */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 shimmer-border animate-pop-in min-h-[460px]">
          <img src={chessKing} alt="Chess king and knight on a wooden board" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/20" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          <div className="relative grid lg:grid-cols-2 gap-8 items-center p-8 sm:p-12">
            <div className="space-y-5">
              <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/20 text-primary border-0 backdrop-blur">
                <Flame className="h-3 w-3 mr-1" /> For chess coaches & academies
              </Badge>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02]">
                Coach like a <span className="gradient-text">fortress.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Rooky Coach is built around it: classes, students, schools and progress, all held in formation.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="shadow-lg shadow-primary/30">
                  <Link to="/auth">Enter the board <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-background/60 backdrop-blur border-border/60">
                  <Link to="/auth">I already coach here</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex justify-end">
              <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
                {[
                  { k: "Coaches", v: "120+" },
                  { k: "Students", v: "3.4k" },
                  { k: "Schools", v: "28" },
                  { k: "Lessons / wk", v: "1.2k" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg shadow-primary/5">
                    <div className="text-3xl font-black gradient-text leading-none">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature trio — matches dashboard card language */}
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { img: chessRook.url, title: "Anchor your roster", body: "Students, classes and schools held in perfect castling." },
            { img: chessLineup.url, title: "Run the lineup", body: "Lessons, attendance and curriculum coverage at a glance." },
            { img: chessFallen.url, title: "Crown the wins", body: "Track badges, progress and the prodigies climbing the ranks." },
          ].map((f) => (
            <article key={f.title} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 backdrop-blur shadow-lg shadow-primary/5 animate-pop-in">
              <div className="relative h-40 overflow-hidden">
                <img src={f.img} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              </div>
              <div className="p-5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-bold tracking-tight">{f.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            </article>
          ))}
        </section>

        {/* CTA strip */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/70 backdrop-blur-xl p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl shadow-primary/10">
          <div className="space-y-1.5 max-w-xl">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80">The rook moves</div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Castle up. <span className="gradient-text">Open with confidence.</span>
            </h2>
            <p className="text-sm text-muted-foreground">Sign in and step onto your console — your kingdom is one move away.</p>
          </div>
          <Button asChild size="lg" className="shadow-lg shadow-primary/30">
            <Link to="/auth">Enter the board <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
