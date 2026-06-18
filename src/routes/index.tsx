import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  Award,
  School as SchoolIcon,
  Clock,
  BookOpen,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Rooky Coach" },
      { name: "description", content: "Manage your chess coaching programmes." },
    ],
  }),
  component: Dashboard,
});

type Coach = { id: string; full_name?: string | null; email?: string | null };

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function initials(name?: string | null, email?: string | null) {
  const s = (name || email || "C").trim();
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || s[0].toUpperCase();
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    schools: 0,
    lessonsThisWeek: 0,
    attendanceRate: 0,
    badgesAwarded: 0,
  });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [recentBadges, setRecentBadges] = useState<any[]>([]);
  const [topicCoverage, setTopicCoverage] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (!cancelled) {
          setAuthed(false);
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;
      setAuthed(true);

      // Coach record
      const { data: coachRow } = await supabase
        .from("coaches")
        .select("id, full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      const c: Coach = coachRow ?? { id: user.id, email: user.email, full_name: user.user_metadata?.full_name };
      setCoach(c);

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const [
        studentsRes,
        classesRes,
        schoolsRes,
        lessonsWeekRes,
        upcomingRes,
        recentLessonsRes,
        attendanceRes,
        badgesAwardedRes,
        progressRes,
        recentBadgesRes,
        coverageRes,
      ] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
        supabase.from("schools").select("id", { count: "exact", head: true }).eq("coach_id", c.id),
        supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .eq("coach_id", c.id)
          .gte("lesson_date", weekStart.toISOString())
          .lt("lesson_date", weekEnd.toISOString()),
        supabase
          .from("lessons")
          .select("id, lesson_date, topic, classes(name), schools(name)")
          .eq("coach_id", c.id)
          .gte("lesson_date", today.toISOString())
          .order("lesson_date", { ascending: true })
          .limit(5),
        supabase
          .from("lessons")
          .select("id, lesson_date, topic, classes(name), schools(name)")
          .eq("coach_id", c.id)
          .lt("lesson_date", today.toISOString())
          .order("lesson_date", { ascending: false })
          .limit(5),
        supabase.from("attendance").select("status").eq("coach_id", c.id),
        supabase
          .from("student_badges")
          .select("id", { count: "exact", head: true })
          .eq("coach_id", c.id),
        supabase
          .from("student_progress")
          .select("student_id, score, students(full_name)")
          .eq("coach_id", c.id)
          .order("score", { ascending: false })
          .limit(5),
        supabase
          .from("student_badges")
          .select("id, awarded_at, badges(name, icon), students(full_name)")
          .eq("coach_id", c.id)
          .order("awarded_at", { ascending: false })
          .limit(6),
        supabase
          .from("topic_coverage")
          .select("id, coverage_pct, curriculum_topics(name)")
          .eq("coach_id", c.id)
          .order("coverage_pct", { ascending: false })
          .limit(6),
      ]);

      if (cancelled) return;

      const att = attendanceRes.data ?? [];
      const present = att.filter((a: any) =>
        ["present", "Present", "PRESENT", true].includes(a.status),
      ).length;
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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (authed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>You're not signed in. Open your existing login page to access the coach dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const name = coach?.full_name || coach?.email?.split("@")[0] || "Coach";

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
              ♞
            </div>
            <div className="font-semibold tracking-tight">Rooky Coach</div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials(coach?.full_name, coach?.email)}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                location.reload();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <section>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening across your coaching programmes.
          </p>
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Students" value={stats.students} loading={loading} />
          <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Classes" value={stats.classes} loading={loading} />
          <StatCard icon={<SchoolIcon className="h-5 w-5" />} label="Schools" value={stats.schools} loading={loading} />
          <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Lessons this week" value={stats.lessonsThisWeek} loading={loading} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Attendance rate" value={`${stats.attendanceRate}%`} loading={loading} />
          <StatCard icon={<Award className="h-5 w-5" />} label="Badges awarded" value={stats.badgesAwarded} loading={loading} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming lessons */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Upcoming lessons</CardTitle>
              <Badge variant="secondary">{upcoming.length}</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRows />
              ) : upcoming.length === 0 ? (
                <Empty text="No upcoming lessons scheduled." />
              ) : (
                <ul className="divide-y">
                  {upcoming.map((l: any) => (
                    <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.topic ?? "Lesson"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.classes?.name ?? "—"} · {l.schools?.name ?? ""}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(l.lesson_date)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" />Recent badges</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRows />
              ) : recentBadges.length === 0 ? (
                <Empty text="No badges awarded yet." />
              ) : (
                <ul className="space-y-3">
                  {recentBadges.map((b: any) => (
                    <li key={b.id} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-base">
                        {b.badges?.icon ?? "🏅"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{b.badges?.name ?? "Badge"}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.students?.full_name ?? "Student"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{fmtDate(b.awarded_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent lessons */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Recent lessons</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRows />
              ) : recentLessons.length === 0 ? (
                <Empty text="No past lessons yet." />
              ) : (
                <ul className="divide-y">
                  {recentLessons.map((l: any) => (
                    <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.topic ?? "Lesson"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.classes?.name ?? "—"} · {l.schools?.name ?? ""}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(l.lesson_date)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Top students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Top students</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRows />
              ) : topStudents.length === 0 ? (
                <Empty text="No progress data yet." />
              ) : (
                <ul className="space-y-3">
                  {topStudents.map((s: any, i: number) => (
                    <li key={`${s.student_id}-${i}`} className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-muted text-xs grid place-items-center font-semibold">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1 text-sm font-medium truncate">
                        {s.students?.full_name ?? "Student"}
                      </div>
                      <Badge variant="secondary">{s.score ?? 0}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Curriculum coverage */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Curriculum coverage</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRows />
              ) : topicCoverage.length === 0 ? (
                <Empty text="No topic coverage tracked yet." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topicCoverage.map((t: any) => (
                    <div key={t.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{t.curriculum_topics?.name ?? "Topic"}</span>
                        <span className="text-muted-foreground">{Math.round(t.coverage_pct ?? 0)}%</span>
                      </div>
                      <Progress value={Math.round(t.coverage_pct ?? 0)} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-primary">{icon}</div>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">
          {loading ? <span className="inline-block h-7 w-12 bg-muted rounded animate-pulse" /> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 bg-muted/60 rounded animate-pulse" />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}
