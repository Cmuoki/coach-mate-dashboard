import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, School as SchoolIcon, GraduationCap, Users, BookOpen, ScrollText, Award, TrendingUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import chessBg from "@/assets/chess-bg.jpg.asset.json";
import chessKnight from "@/assets/chess-knight.jpg.asset.json";
import chessRook from "@/assets/chess-rook.webp.asset.json";
import chessCrown from "@/assets/chess-crown.jpg.asset.json";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schools", label: "Schools", icon: SchoolIcon },
  { to: "/classes", label: "Classes", icon: GraduationCap },
  { to: "/students", label: "Students", icon: Users },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/curriculum", label: "Curriculum", icon: ScrollText },
  { to: "/badges", label: "Badges", icon: Award },
  { to: "/progress", label: "Progress", icon: TrendingUp },
] as const;


function initials(name?: string | null, email?: string | null) {
  const s = (name || email || "C").trim();
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || s[0]!.toUpperCase();
}

export function CoachShell({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [coach, setCoach] = useState<{ full_name: string | null; email: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      const { data: c } = await supabase.from("coaches").select("full_name,email").eq("id", u.id).maybeSingle();
      setCoach({ full_name: c?.full_name ?? null, email: c?.email ?? u.email ?? null });
    })();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <img src={chessBg.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background/95" />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <img src={chessKnight.url} alt="" className="absolute top-24 -left-16 h-64 w-64 object-cover rounded-3xl opacity-25 blur-[1px] animate-float shadow-2xl" />
        <img src={chessCrown.url} alt="" className="absolute top-1/3 -right-16 h-72 w-72 object-cover rounded-3xl opacity-25 blur-[1px] animate-float-slow shadow-2xl" />
        <img src={chessRook.url} alt="" className="absolute bottom-10 left-1/3 h-56 w-56 object-cover rounded-3xl opacity-20 blur-[1px] animate-float shadow-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/50 to-background/80" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-3 shrink-0">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-xl shadow-lg shadow-primary/30">
              ♜
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold tracking-tight leading-none">Rooky Coach</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">Coach console</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.to || pathname.startsWith(n.to + "/");
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/30">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                {initials(coach?.full_name, coach?.email)}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden border-t border-border/40 bg-background/60 backdrop-blur">
          <div className="max-w-7xl mx-auto px-2 flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => {
              const active = pathname === n.to || pathname.startsWith(n.to + "/");
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap ${active ? "text-primary font-semibold border-b-2 border-primary" : "text-muted-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>

      <footer className="relative mt-16 border-t border-border/40 bg-background/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Rooky Coach</span>
          <span className="hidden sm:inline">Every pawn matters.</span>
        </div>
      </footer>
    </div>
  );
}
