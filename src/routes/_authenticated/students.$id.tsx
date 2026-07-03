import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, GraduationCap, Award, TrendingUp, CalendarCheck, Sparkles, Loader2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { generateStudentReport } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/students/$id")({
  head: () => ({ meta: [{ title: "Student · Rooky Coach" }] }),
  component: StudentDetail,
});

type Student = { id: string; full_name: string; rating: number | null; class_id: string | null; className?: string | null };
type BadgeRow = { id: string; awarded_at: string; name: string; icon: string | null };
type Progress = { id: string; score: number; recorded_at: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0]?.toUpperCase();
}

function StudentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attendance, setAttendance] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: s, error } = await supabase.from("students").select("id,full_name,rating,class_id").eq("id", id).maybeSingle();
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!s) { toast.error("Student not found"); navigate({ to: "/students" }); return; }
    let className: string | null = null;
    if (s.class_id) {
      const { data: c } = await supabase.from("classes").select("name").eq("id", s.class_id).maybeSingle();
      className = c?.name ?? null;
    }
    setStudent({ ...(s as Student), className });

    const [{ data: sb }, { data: pr }, { data: att }] = await Promise.all([
      supabase.from("student_badges").select("id,awarded_at,badge_id").eq("student_id", id).order("awarded_at", { ascending: false }),
      supabase.from("student_progress").select("id,score,recorded_at").eq("student_id", id).order("recorded_at", { ascending: false }).limit(20),
      supabase.from("attendance").select("status").eq("student_id", id),
    ]);

    const badgeIds = (sb ?? []).map((b: any) => b.badge_id);
    let nameMap = new Map<string, { name: string; icon: string | null }>();
    if (badgeIds.length) {
      const { data: bs } = await supabase.from("badges").select("id,name,icon").in("id", badgeIds);
      nameMap = new Map((bs ?? []).map((b: any) => [b.id, { name: b.name, icon: b.icon }]));
    }
    setBadges((sb ?? []).map((b: any) => ({
      id: b.id, awarded_at: b.awarded_at,
      name: nameMap.get(b.badge_id)?.name ?? "Badge",
      icon: nameMap.get(b.badge_id)?.icon ?? null,
    })));
    setProgress((pr ?? []) as Progress[]);
    const total = (att ?? []).length;
    const present = (att ?? []).filter((a: any) => a.status === "present").length;
    setAttendance({ total, present });
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  const attendancePct = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : 0;

  return (
    <CoachShell
      title={student?.full_name ?? "Student"}
      subtitle={student?.className ? `In ${student.className}` : "Student profile"}
      actions={<Button variant="ghost" asChild><Link to="/students"><ArrowLeft className="h-4 w-4" /> All students</Link></Button>}
    >
      <Card className="bg-background/70 backdrop-blur">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg font-bold">{initials(student?.full_name ?? "?")}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-xl font-bold">{student?.full_name}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {student?.className && student?.class_id && (
                <Link to="/classes/$id" params={{ id: student.class_id }}>
                  <Badge variant="outline" className="rounded-full"><GraduationCap className="h-3 w-3 mr-1" />{student.className}</Badge>
                </Link>
              )}
              {student?.rating != null && student.rating > 0 && (
                <Badge className="rounded-full"><TrendingUp className="h-3 w-3 mr-1" />Rating {student.rating}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-bold flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> Attendance</h2>
            {loading ? <div className="h-16 rounded-lg bg-muted/40 animate-pulse" /> : attendance.total === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records yet.</p>
            ) : (
              <>
                <div className="text-3xl font-black">{attendancePct}%</div>
                <Progress value={attendancePct} />
                <p className="text-xs text-muted-foreground">{attendance.present} present of {attendance.total} lessons</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/70 backdrop-blur lg:col-span-2">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-bold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Badges earned ({badges.length})</h2>
            {loading ? <div className="h-16 rounded-lg bg-muted/40 animate-pulse" /> : badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <Badge key={b.id} variant="secondary" className="rounded-full py-1.5 pr-3">
                    <span className="mr-1.5">{b.icon || "🏅"}</span>{b.name}
                    <span className="text-muted-foreground ml-2 text-[10px]">{fmtDate(b.awarded_at)}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background/70 backdrop-blur">
        <CardContent className="p-6 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Recent progress</h2>
          {loading ? <div className="h-16 rounded-lg bg-muted/40 animate-pulse" /> : progress.length === 0 ? (
            <p className="text-sm text-muted-foreground">No progress entries yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {progress.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{fmtDate(p.recorded_at)}</span>
                  <Badge variant="secondary" className="rounded-full">Score {p.score}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </CoachShell>
  );
}
