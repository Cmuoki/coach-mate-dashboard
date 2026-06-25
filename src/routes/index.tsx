import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import rookHero from "@/assets/rook-hero.jpg.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rooky Coach · Build your chess fortress" },
      {
        name: "description",
        content:
          "Rooky Coach helps coaches run schools, classes, and students like a well-defended rook line.",
      },
      { property: "og:title", content: "Rooky Coach" },
      { property: "og:description", content: "Coach chess like a fortress. Built around the rook." },
      { property: "og:image", content: rookHero.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: rookHero.url },
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
      <div className="min-h-screen grid place-items-center bg-slate-950 text-emerald-100">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-3xl animate-pulse" />
            <img
              src={rookHero.url}
              alt="Rook"
              className="relative h-40 w-auto object-contain animate-float drop-shadow-[0_10px_30px_rgba(16,185,129,0.45)]"
            />
          </div>
          <div className="flex items-center gap-2 text-sm tracking-[0.4em] uppercase text-emerald-300/80">
            <span className="h-px w-8 bg-emerald-400/60" />
            Rooky Coach
            <span className="h-px w-8 bg-emerald-400/60" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Ambient backdrop */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(16,185,129,0.35), transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(217,170,68,0.18), transparent 65%)",
        }}
      />
      <div className="absolute inset-0 chess-board-bg opacity-[0.06]" />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 grid place-items-center overflow-hidden">
            <img src={rookHero.url} alt="" className="h-9 w-9 object-cover" />
          </div>
          <div className="font-semibold tracking-tight text-lg">Rooky Coach</div>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-slate-300 hover:text-white transition-colors">
            Sign in
          </Link>
          <Button asChild className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 grid lg:grid-cols-2 gap-10 items-center px-6 md:px-12 pt-6 pb-16 max-w-7xl mx-auto">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            For chess coaches & academies
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
            Coach like a{" "}
            <span className="bg-gradient-to-br from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
              fortress.
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
            The rook is your anchor — steady, powerful, defending the back rank. Rooky Coach is
            built around it: classes, students, schools and progress, all held in formation.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]">
              <Link to="/auth">Enter the board</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-900">
              <Link to="/auth">I already coach here</Link>
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-6 text-xs uppercase tracking-widest text-slate-400">
            <div><span className="text-emerald-400 font-semibold">120+</span> coaches</div>
            <div className="h-4 w-px bg-slate-700" />
            <div><span className="text-emerald-400 font-semibold">3.4k</span> students</div>
            <div className="h-4 w-px bg-slate-700" />
            <div><span className="text-emerald-400 font-semibold">28</span> schools</div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-emerald-500/20 blur-[80px]" />
          <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-emerald-400/30 via-transparent to-amber-300/20 blur-2xl" />
          <div className="relative rounded-[2rem] overflow-hidden ring-1 ring-emerald-400/20 bg-slate-900/40 backdrop-blur">
            <img
              src={rookHero.url}
              alt="The Rook — Rooky Coach"
              width={1024}
              height={1536}
              className="w-full h-[520px] md:h-[640px] object-cover animate-float-slow"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">The Rook</div>
                <div className="text-2xl font-semibold text-white">Your anchor piece</div>
              </div>
              <div className="rounded-lg bg-slate-950/60 ring-1 ring-emerald-400/30 px-3 py-2 text-xs text-emerald-200">
                +5 value · castling ready
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
