import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users, GraduationCap, CalendarCheck, TrendingUp, Award,
  School as SchoolIcon, Clock, BookOpen, LogOut, Sparkles, Crown, Flame,
} from "lucide-react";
import chessKing from "@/assets/chess-king.jpg";
import chessFallen from "@/assets/chess-fallen.webp.asset.json";
import chessRook from "@/assets/chess-rook.webp.asset.json";
import chessLineup from "@/assets/chess-lineup.webp.asset.json";
import chessBg from "@/assets/chess-bg.jpg.asset.json";
import chessKnight from "@/assets/chess-knight.jpg.asset.json";
import chessCrown from "@/assets/chess-crown.jpg.asset.json";

const CHESS_IMAGES = {
  king: chessKing,
  fallen: chessFallen.url,
  rook: chessRook.url,
  lineup: chessLineup.url,
  bg: chessBg.url,
  knight: chessKnight.url,
  crown: chessCrown.url,
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Rooky Coach" }] }),
  component: Dashboard,
});

type Coach = { id: string; full_name: string | null; email: string | null };

const PIECES = ["♔","♕","♖","♗","♘","♙"] as const;
const PIECE_NAMES = ["King","Queen","Rook","Bishop","Knight","Pawn"];

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function initials(name?: string | null, email?: string | null) {
  const s = (name || email || "C").trim();
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || s[0]!.toUpperCase();
}

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [stats, setStats] = useState({ students: 0, classes: 0, schools: 0, lessonsThisWeek: 0, attendanceRate: 0, badgesAwarded: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [recentBadges, setRecentBadges] = useState<any[]>([]);
  const [topicCoverage, setTopicCoverage] = useState<any[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data: coachRow } = await supabase.from("coaches").select("id, full_name, email").eq("id", user.id).maybeSingle();
    const c: Coach = coachRow ?? { id: user.id, email: user.email ?? null, full_name: (user.user_metadata as any)?.full_name ?? null };
    setCoach(c);

    const today = new Date();
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay()); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

    const [studentsRes, classesRes, schoolsRes, lessonsWeekRes, upcomingRes, recentLessonsRes, attendanceRes, badgesAwardedRes, progressRes, recentBadgesRes, coverageRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
      supabase.from("classes").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
      supabase.from("schools").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
      supabase.from("lessons").select("id", { count: "exact", head: true }).eq("coach_id", c.id).gte("lesson_date", weekStart.toISOString()).lt("lesson_date", weekEnd.toISOString()),
      supabase.from("lessons").select("id, lesson_date, topic, classes(name), schools(name)").eq("coach_id", c.id).gte("lesson_date", today.toISOString()).order("lesson_date", { ascending: true }).limit(5),
      supabase.from("lessons").select("id, lesson_date, topic, classes(name), schools(name)").eq("coach_id", c.id).lt("lesson_date", today.toISOString()).order("lesson_date", { ascending: false }).limit(5),
      supabase.from("attendance").select("status").eq("coach_id", c.id),
      supabase.from("student_badges").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
      supabase.from("student_progress").select("student_id, score, students(full_name)").eq("coach_id", c.id).order("score", { ascending: false }).limit(5),
      supabase.from("student_badges").select("id, awarded_at, badges(name, icon), students(full_name)").eq("coach_id", c.id).order("awarded_at", { ascending: false }).limit(6),
      supabase.from("topic_coverage").select("id, coverage_pct, curriculum_topics(name)").eq("coach_id", c.id).order("coverage_pct", { ascending: false }).limit(6),
    ]);

    const att = (attendanceRes.data ?? []) as any[];
    const present = att.filter((a) => a.status === "present").length;
    const rate = att.length ? Math.round((present / att.length) * 100) : 0;

    setStats({
      students: studentsRes.count ?? 0,
      classes: classesRes.count ?? 0,
      schools: schoolsRes.count ?? 0,
      lessonsThisWeek: lessonsWeekRes.count ?? 0,
      attendanceRate: rate,
      badgesAwarded: badgesAwardedRes.count ?? 0,
    });
    setUpcoming(upcomingRes.data ?? []);
    setRecentLessons(recentLessonsRes.data ?? []);
    setTopStudents(progressRes.data ?? []);
    setRecentBadges(recentBadgesRes.data ?? []);
    setTopicCoverage(coverageRes.data ?? []);
    setIsEmpty((schoolsRes.count ?? 0) === 0 && (studentsRes.count ?? 0) === 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  async function handleSeed() {
    if (!coach) return;
    setSeeding(true);
    try {
      const coachId = coach.id;
      const { data: school } = await supabase.from("schools").insert({ coach_id: coachId, name: "Lincoln Primary School", address: "12 Park Lane" }).select().single();
      const { data: school2 } = await supabase.from("schools").insert({ coach_id: coachId, name: "Riverside Academy", address: "8 River Rd" }).select().single();
      const { data: classes } = await supabase.from("classes").insert([
        { coach_id: coachId, school_id: school!.id, name: "Beginners A", level: "Beginner" },
        { coach_id: coachId, school_id: school!.id, name: "Intermediate", level: "Intermediate" },
        { coach_id: coachId, school_id: school2!.id, name: "Advanced", level: "Advanced" },
      ]).select();
      const sNames = ["Aiden Lee","Maya Patel","Noah Kim","Sofia Garcia","Liam Chen","Emma Brown","Oliver Singh","Ava Johnson","Ethan Davis","Mia Wilson","Lucas Martinez","Isla Thompson"];
      const studentsPayload = sNames.map((n, i) => ({ coach_id: coachId, class_id: classes![i % classes!.length].id, full_name: n, rating: 400 + Math.floor(Math.random() * 800) }));
      const { data: students } = await supabase.from("students").insert(studentsPayload).select();
      const lessonRows: any[] = [];
      const topics = ["Pawn Endgames","Forks & Pins","Italian Opening","Mating Patterns","Pawn Structures"];
      for (let i = -6; i <= 4; i++) {
        const d = new Date(); d.setDate(d.getDate() + i * 2);
        lessonRows.push({ coach_id: coachId, class_id: classes![Math.abs(i) % classes!.length].id, school_id: classes![Math.abs(i) % classes!.length].school_id, topic: topics[Math.abs(i) % topics.length], lesson_date: d.toISOString() });
      }
      const { data: lessons } = await supabase.from("lessons").insert(lessonRows).select();
      const past = (lessons ?? []).filter((l: any) => new Date(l.lesson_date) < new Date());
      const attRows: any[] = [];
      for (const l of past) for (const s of students!.slice(0, 8)) attRows.push({ coach_id: coachId, lesson_id: l.id, student_id: s.id, status: Math.random() < 0.85 ? "present" : "absent" });
      if (attRows.length) await supabase.from("attendance").insert(attRows);
      const progressRows = students!.map((s: any) => ({ coach_id: coachId, student_id: s.id, score: 40 + Math.floor(Math.random() * 60) }));
      await supabase.from("student_progress").insert(progressRows);
      const { data: topics2 } = await supabase.from("curriculum_topics").select("id").limit(6);
      if (topics2) await supabase.from("topic_coverage").insert(topics2.map((t: any) => ({ coach_id: coachId, topic_id: t.id, class_id: classes![0].id, coverage_pct: 30 + Math.floor(Math.random() * 70) })));
      const { data: badgesCat } = await supabase.from("badges").select("id").limit(5);
      if (badgesCat) {
        const sbRows: any[] = [];
        students!.slice(0, 6).forEach((s: any, i: number) => sbRows.push({ coach_id: coachId, student_id: s.id, badge_id: badgesCat[i % badgesCat.length].id }));
        await supabase.from("student_badges").insert(sbRows);
      }
      toast.success("Sample data loaded ♞");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to seed");
    } finally { setSeeding(false); }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const name = coach?.full_name || coach?.email?.split("@")[0] || "Coach";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient chess photo backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <img src={CHESS_IMAGES.bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>
      {/* Floating chess pieces backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-24 -left-6 text-[180px] leading-none text-primary/5 select-none animate-float" style={{ ["--rot" as any]: "-8deg" }}>♞</div>
        <div className="absolute top-1/3 right-[-30px] text-[220px] leading-none text-primary/5 select-none animate-float-slow" style={{ ["--rot" as any]: "12deg" }}>♛</div>
        <div className="absolute bottom-10 left-1/3 text-[160px] leading-none text-primary/[0.04] select-none animate-float" style={{ ["--rot" as any]: "6deg", animationDelay: "1.5s" }}>♜</div>
        <div className="absolute top-[60%] left-10 text-[120px] leading-none text-primary/[0.05] select-none animate-float-slow" style={{ ["--rot" as any]: "-15deg" }}>♝</div>
      </div>

      {/* Header */}
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
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/30">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                {initials(coach?.full_name, coach?.email)}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10 relative">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 shimmer-border animate-pop-in min-h-[280px]">
          <img
            src={CHESS_IMAGES.king}
            alt="Chess king and knight on a wooden board"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/30" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 p-8 sm:p-10">
            <div className="space-y-3 max-w-xl">
              <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/20 text-primary border-0 backdrop-blur">
                <Flame className="h-3 w-3 mr-1" /> Live board
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-sm">
                {greeting}, <span className="gradient-text">{name}</span>
              </h1>
              <p className="text-muted-foreground">
                Your kingdom at a glance — every pawn, every prodigy, every move that matters.
              </p>
            </div>
            {isEmpty && !loading && (
              <Button size="lg" onClick={handleSeed} disabled={seeding} className="shadow-lg shadow-primary/30 backdrop-blur">
                <Sparkles className="h-4 w-4" /> {seeding ? "Setting the board…" : "Load sample data"}
              </Button>
            )}
          </div>
        </section>

        {/* Imagery strip */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { src: CHESS_IMAGES.lineup, label: "The lineup", sub: "Every student in formation" },
            { src: CHESS_IMAGES.rook, label: "Stand tall", sub: "Strategy starts with structure" },
            { src: CHESS_IMAGES.fallen, label: "Last pawn standing", sub: "Endgames are won, not given" },
          ].map((tile) => (
            <div key={tile.label} className="group relative h-32 sm:h-40 rounded-2xl overflow-hidden border border-border/60 shadow-md">
              <img src={tile.src} alt={tile.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                <div className="text-sm sm:text-base font-bold leading-tight">{tile.label}</div>
                <div className="text-[10px] sm:text-xs opacity-80 hidden sm:block">{tile.sub}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Stat cards with chess piece per metric */}
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard piece="♙" label="Students" value={stats.students} loading={loading} icon={<Users className="h-4 w-4" />} delay={0} />
          <StatCard piece="♘" label="Classes" value={stats.classes} loading={loading} icon={<GraduationCap className="h-4 w-4" />} delay={60} />
          <StatCard piece="♖" label="Schools" value={stats.schools} loading={loading} icon={<SchoolIcon className="h-4 w-4" />} delay={120} />
          <StatCard piece="♗" label="This week" value={stats.lessonsThisWeek} loading={loading} icon={<CalendarCheck className="h-4 w-4" />} delay={180} />
          <StatCard piece="♕" label="Attendance" value={`${stats.attendanceRate}%`} loading={loading} icon={<TrendingUp className="h-4 w-4" />} delay={240} />
          <StatCard piece="♔" label="Badges" value={stats.badgesAwarded} loading={loading} icon={<Award className="h-4 w-4" />} delay={300} highlight />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FlairCard className="lg:col-span-2" piece="♗" title="Upcoming lessons" icon={<Clock className="h-4 w-4" />} bgImage={CHESS_IMAGES.knight} right={<Badge className="bg-primary/10 text-primary border-0">{upcoming.length}</Badge>}>
            {loading ? <SkeletonRows /> : upcoming.length === 0 ? <Empty text="No upcoming lessons scheduled." /> : (
              <ul className="divide-y divide-border/60">
                {upcoming.map((l: any, i: number) => (
                  <li key={l.id} className="py-3 flex items-center gap-3 group">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/0 grid place-items-center text-lg text-primary group-hover:scale-110 transition">
                      {PIECES[i % PIECES.length]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{l.topic ?? "Lesson"}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.classes?.name ?? "—"} · {l.schools?.name ?? ""}</div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(l.lesson_date)}</div>
                  </li>
                ))}
              </ul>
            )}
          </FlairCard>

          <FlairCard piece="♛" title="Recent badges" icon={<Award className="h-4 w-4" />} bgImage={CHESS_IMAGES.crown}>
            {loading ? <SkeletonRows /> : recentBadges.length === 0 ? <Empty text="No badges awarded yet." /> : (
              <ul className="space-y-3">
                {recentBadges.map((b: any) => (
                  <li key={b.id} className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-primary/5 transition">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300/30 to-primary/20 grid place-items-center text-lg ring-1 ring-amber-300/30">
                      {b.badges?.icon ?? "🏅"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{b.badges?.name ?? "Badge"}</div>
                      <div className="text-xs text-muted-foreground truncate">{b.students?.full_name ?? "Student"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{fmtDate(b.awarded_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </FlairCard>

          <FlairCard className="lg:col-span-2" piece="♜" title="Recent lessons" icon={<BookOpen className="h-4 w-4" />} bgImage={CHESS_IMAGES.lineup}>
            {loading ? <SkeletonRows /> : recentLessons.length === 0 ? <Empty text="No past lessons yet." /> : (
              <ul className="divide-y divide-border/60">
                {recentLessons.map((l: any, i: number) => (
                  <li key={l.id} className="py-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center text-lg">{PIECES[(i+2) % PIECES.length]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{l.topic ?? "Lesson"}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.classes?.name ?? "—"} · {l.schools?.name ?? ""}</div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(l.lesson_date)}</div>
                  </li>
                ))}
              </ul>
            )}
          </FlairCard>

          <FlairCard piece="♔" title="Top students" icon={<Crown className="h-4 w-4" />} bgImage={CHESS_IMAGES.rook}>
            {loading ? <SkeletonRows /> : topStudents.length === 0 ? <Empty text="No progress data yet." /> : (
              <ul className="space-y-2">
                {topStudents.map((s: any, i: number) => {
                  const medal = ["from-amber-400 to-yellow-500","from-slate-300 to-slate-400","from-amber-700 to-amber-900"][i] ?? "from-primary/40 to-primary/20";
                  return (
                    <li key={`${s.student_id}-${i}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-primary/5 transition">
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${medal} text-white text-xs grid place-items-center font-bold shadow`}>{i + 1}</div>
                      <div className="min-w-0 flex-1 text-sm font-medium truncate">{s.students?.full_name ?? "Student"}</div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0">{s.score ?? 0}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </FlairCard>

          <FlairCard className="lg:col-span-3" piece="♘" title="Curriculum coverage" icon={<BookOpen className="h-4 w-4" />}>
            {loading ? <SkeletonRows /> : topicCoverage.length === 0 ? <Empty text="No topic coverage tracked yet." /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {topicCoverage.map((t: any, i: number) => (
                  <div key={t.id} className="space-y-2 rounded-xl border border-border/60 p-4 bg-gradient-to-br from-card to-primary/5 hover:shadow-md hover:-translate-y-0.5 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg text-primary">{PIECES[i % PIECES.length]}</span>
                        <span className="font-medium truncate text-sm">{t.curriculum_topics?.name ?? "Topic"}</span>
                      </div>
                      <span className="text-xs font-bold text-primary">{Math.round(t.coverage_pct ?? 0)}%</span>
                    </div>
                    <Progress value={Math.round(t.coverage_pct ?? 0)} />
                  </div>
                ))}
              </div>
            )}
          </FlairCard>
        </div>

        <footer className="text-center text-xs text-muted-foreground py-4">
          <span className="opacity-60">♙ ♘ ♗ ♖ ♕ ♔</span>
          <div className="mt-1">Every lesson is a move. Play the long game.</div>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ piece, icon, label, value, loading, delay = 0, highlight = false }: { piece: string; icon: React.ReactNode; label: string; value: number | string; loading: boolean; delay?: number; highlight?: boolean }) {
  return (
    <Card
      className={`relative overflow-hidden border-border/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-pop-in ${highlight ? "bg-gradient-to-br from-primary/15 via-card to-card" : "bg-gradient-to-br from-card to-primary/5"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div aria-hidden className="absolute -right-3 -bottom-4 text-7xl leading-none text-primary/10 select-none group-hover:rotate-12 transition">{piece}</div>
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="text-primary opacity-70">{icon}</div>
        </div>
        <div className="mt-3 text-3xl font-black tracking-tight">
          {loading ? <span className="inline-block h-8 w-14 bg-muted rounded animate-pulse" /> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function FlairCard({ children, className = "", piece, title, icon, right, bgImage }: { children: React.ReactNode; className?: string; piece: string; title: string; icon: React.ReactNode; right?: React.ReactNode; bgImage?: string }) {
  return (
    <Card className={`relative overflow-hidden border-border/60 bg-card/80 backdrop-blur animate-pop-in ${className}`}>
      {bgImage && (
        <>
          <img src={bgImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-[0.08] pointer-events-none" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-card/40 via-card/70 to-card/95 pointer-events-none" />
        </>
      )}
      <div aria-hidden className="absolute -top-4 -right-2 text-[110px] leading-none text-primary/[0.06] select-none rotate-[10deg] pointer-events-none">{piece}</div>
      <CardHeader className="flex flex-row items-center justify-between relative">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</span>
          {title}
        </CardTitle>
        {right}
      </CardHeader>
      <CardContent className="relative">{children}</CardContent>
    </Card>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-muted/60 rounded animate-pulse" />)}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-8 space-y-2">
      <div className="text-4xl opacity-40">{PIECES[Math.floor(Math.random() * PIECES.length)]}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// Keep PIECE_NAMES referenced to avoid unused warnings
void PIECE_NAMES;
