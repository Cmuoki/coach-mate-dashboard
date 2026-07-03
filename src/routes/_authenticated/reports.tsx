import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, TrendingDown, Minus, Users, BookOpen, CheckCircle2, Sparkles, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { generateNarrativeReport } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports · Rooky Coach" }] }),
  component: ReportsPage,
});

type Cls = { id: string; name: string; level: string | null; school_id: string | null };
type Student = { id: string; full_name: string; class_id: string | null; rating: number | null };
type Lesson = { id: string; class_id: string | null; lesson_date: string };
type Attendance = { student_id: string; lesson_id: string; status: string };
type Coverage = { class_id: string | null; topic_id: string; coverage_pct: number };
type Progress = { student_id: string; score: number; recorded_at: string };

// Term = current calendar term: Jan–Apr, May–Aug, Sep–Dec
function currentTermRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let start: Date, end: Date, label: string;
  if (m <= 3) { start = new Date(y, 0, 1); end = new Date(y, 4, 0, 23, 59, 59); label = `Term 1 · Jan–Apr ${y}`; }
  else if (m <= 7) { start = new Date(y, 4, 1); end = new Date(y, 8, 0, 23, 59, 59); label = `Term 2 · May–Aug ${y}`; }
  else { start = new Date(y, 8, 1); end = new Date(y, 11, 31, 23, 59, 59); label = `Term 3 · Sep–Dec ${y}`; }
  return { start, end, label };
}

function trend(scores: number[]): { delta: number; icon: typeof TrendingUp } {
  if (scores.length < 2) return { delta: 0, icon: Minus };
  const delta = scores[scores.length - 1] - scores[0];
  return { delta, icon: delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus };
}

function csvDownload(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ReportsPage() {
  const term = useMemo(currentTermRange, []);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [topicCount, setTopicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const startIso = term.start.toISOString();
    const endIso = term.end.toISOString();
    const [{ data: cs }, { data: st }, { data: ls }, { data: cov }, { data: pr }, { data: tp }] = await Promise.all([
      supabase.from("classes").select("id,name,level,school_id").order("name"),
      supabase.from("students").select("id,full_name,class_id,rating").order("full_name"),
      supabase.from("lessons").select("id,class_id,lesson_date").gte("lesson_date", startIso).lte("lesson_date", endIso),
      supabase.from("topic_coverage").select("class_id,topic_id,coverage_pct"),
      supabase.from("student_progress").select("student_id,score,recorded_at").gte("recorded_at", startIso).lte("recorded_at", endIso).order("recorded_at"),
      supabase.from("curriculum_topics").select("id"),
    ]);
    setClasses((cs ?? []) as Cls[]);
    setStudents((st ?? []) as Student[]);
    setLessons((ls ?? []) as Lesson[]);
    setCoverage((cov ?? []) as Coverage[]);
    setProgress((pr ?? []) as Progress[]);
    setTopicCount((tp ?? []).length);
    const lessonIds = (ls ?? []).map((l: any) => l.id);
    if (lessonIds.length) {
      const { data: att, error } = await supabase.from("attendance").select("student_id,lesson_id,status").in("lesson_id", lessonIds);
      if (error) toast.error(error.message);
      setAttendance((att ?? []) as Attendance[]);
    } else setAttendance([]);
    setLoading(false);
  }, [term]);

  useEffect(() => { void load(); }, [load]);

  const visibleClasses = classFilter === "all" ? classes : classes.filter((c) => c.id === classFilter);
  const visibleClassIds = new Set(visibleClasses.map((c) => c.id));

  // Per-class rollup
  const classRows = visibleClasses.map((c) => {
    const classStudents = students.filter((s) => s.class_id === c.id);
    const classLessons = lessons.filter((l) => l.class_id === c.id);
    const classLessonIds = new Set(classLessons.map((l) => l.id));
    const classAtt = attendance.filter((a) => classLessonIds.has(a.lesson_id));
    const present = classAtt.filter((a) => a.status === "present" || a.status === "late").length;
    const attRate = classAtt.length ? Math.round((present / classAtt.length) * 100) : 0;
    const classCov = coverage.filter((cv) => cv.class_id === c.id);
    const covPct = topicCount ? Math.round(classCov.reduce((s, r) => s + Number(r.coverage_pct || 0), 0) / topicCount) : 0;
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const classProg = progress.filter((p) => classStudentIds.has(p.student_id));
    const byStudent = new Map<string, number[]>();
    classProg.forEach((p) => { const arr = byStudent.get(p.student_id) ?? []; arr.push(p.score); byStudent.set(p.student_id, arr); });
    const deltas = Array.from(byStudent.values()).map((arr) => arr[arr.length - 1] - arr[0]);
    const avgDelta = deltas.length ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10 : 0;
    return { cls: c, students: classStudents.length, lessons: classLessons.length, attRate, covPct, avgDelta };
  });

  // Per-student rollup
  const studentRows = students
    .filter((s) => !s.class_id || visibleClassIds.has(s.class_id) || classFilter === "all")
    .filter((s) => classFilter === "all" || s.class_id === classFilter)
    .map((s) => {
      const stAtt = attendance.filter((a) => a.student_id === s.id);
      const present = stAtt.filter((a) => a.status === "present" || a.status === "late").length;
      const attRate = stAtt.length ? Math.round((present / stAtt.length) * 100) : 0;
      const scores = progress.filter((p) => p.student_id === s.id).map((p) => p.score);
      const t = trend(scores);
      const cls = classes.find((c) => c.id === s.class_id);
      return { student: s, className: cls?.name ?? "—", lessons: stAtt.length, attRate, entries: scores.length, latest: scores[scores.length - 1] ?? null, delta: t.delta };
    });

  // Totals
  const totalLessons = lessons.filter((l) => classFilter === "all" || l.class_id === classFilter).length;
  const attInScope = attendance.filter((a) => {
    if (classFilter === "all") return true;
    const l = lessons.find((x) => x.id === a.lesson_id);
    return l?.class_id === classFilter;
  });
  const overallAtt = attInScope.length ? Math.round((attInScope.filter((a) => a.status === "present" || a.status === "late").length / attInScope.length) * 100) : 0;
  const overallCov = classRows.length ? Math.round(classRows.reduce((s, r) => s + r.covPct, 0) / classRows.length) : 0;

  function exportClasses() {
    csvDownload(`class-report-${term.label.replace(/\s+/g, "-")}`, [
      ["Class", "Level", "Students", "Lessons", "Attendance %", "Coverage %", "Avg progress Δ"],
      ...classRows.map((r) => [r.cls.name, r.cls.level ?? "", r.students, r.lessons, r.attRate, r.covPct, r.avgDelta]),
    ]);
  }
  function exportStudents() {
    csvDownload(`student-report-${term.label.replace(/\s+/g, "-")}`, [
      ["Student", "Class", "Sessions", "Attendance %", "Progress entries", "Latest score", "Δ"],
      ...studentRows.map((r) => [r.student.full_name, r.className, r.lessons, r.attRate, r.entries, r.latest ?? "", r.delta]),
    ]);
  }

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFocus, setAiFocus] = useState("");
  const [aiReport, setAiReport] = useState("");
  const runGenerate = useServerFn(generateNarrativeReport);

  async function generateReport() {
    setAiLoading(true);
    setAiReport("");
    try {
      const scope = classFilter === "all" ? "All classes" : `Class: ${classes.find((c) => c.id === classFilter)?.name ?? ""}`;
      const { report } = await runGenerate({
        data: {
          termLabel: term.label,
          scope,
          focus: aiFocus.trim() || undefined,
          totals: { classes: classRows.length, lessons: totalLessons, attendancePct: overallAtt, coveragePct: overallCov },
          classes: classRows.map((r) => ({ name: r.cls.name, level: r.cls.level, students: r.students, lessons: r.lessons, attRate: r.attRate, covPct: r.covPct, avgDelta: r.avgDelta })),
          students: studentRows.map((r) => ({ name: r.student.full_name, className: r.className, lessons: r.lessons, attRate: r.attRate, entries: r.entries, latest: r.latest, delta: r.delta })),
        },
      });
      setAiReport(report);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate report");
    } finally {
      setAiLoading(false);
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([aiReport], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `narrative-report-${term.label.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <CoachShell
      title="Reports"
      subtitle={term.label}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setAiOpen(true); if (!aiReport) void generateReport(); }}>
            <Sparkles className="h-4 w-4" /> Generate report
          </Button>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-52 bg-background/70"><SelectValue placeholder="Filter by class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Totals */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center"><Users className="h-5 w-5" /></div>
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Classes</div><div className="text-2xl font-bold">{classRows.length}</div></div>
          </CardContent>
        </Card>
        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center"><BookOpen className="h-5 w-5" /></div>
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Lessons this term</div><div className="text-2xl font-bold">{totalLessons}</div></div>
          </CardContent>
        </Card>
        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-500 grid place-items-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Avg attendance</div><div className="text-2xl font-bold">{overallAtt}%</div></div>
          </CardContent>
        </Card>
        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 grid place-items-center"><TrendingUp className="h-5 w-5" /></div>
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Avg coverage</div><div className="text-2xl font-bold">{overallCov}%</div></div>
          </CardContent>
        </Card>
      </div>

      {/* Per-class report */}
      <Card className="bg-background/70 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Per-class summary</h2>
              <p className="text-xs text-muted-foreground">Attendance, curriculum coverage and average progress delta for the term.</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportClasses} disabled={!classRows.length}><Download className="h-4 w-4" /> CSV</Button>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />)}</div>
          ) : classRows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No classes match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Lessons</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead className="text-right">Avg Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classRows.map((r) => (
                    <TableRow key={r.cls.id}>
                      <TableCell>
                        <div className="font-medium">{r.cls.name}</div>
                        {r.cls.level && <div className="text-xs text-muted-foreground">{r.cls.level}</div>}
                      </TableCell>
                      <TableCell className="text-right">{r.students}</TableCell>
                      <TableCell className="text-right">{r.lessons}</TableCell>
                      <TableCell className="w-40"><div className="flex items-center gap-2"><Progress value={r.attRate} className="h-2" /><span className="text-xs w-10 text-right">{r.attRate}%</span></div></TableCell>
                      <TableCell className="w-40"><div className="flex items-center gap-2"><Progress value={r.covPct} className="h-2" /><span className="text-xs w-10 text-right">{r.covPct}%</span></div></TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.avgDelta > 0 ? "default" : r.avgDelta < 0 ? "destructive" : "secondary"} className="rounded-full">
                          {r.avgDelta > 0 ? "+" : ""}{r.avgDelta}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-student report */}
      <Card className="bg-background/70 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Per-student summary</h2>
              <p className="text-xs text-muted-foreground">Attendance and progress trend for each student this term.</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportStudents} disabled={!studentRows.length}><Download className="h-4 w-4" /> CSV</Button>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />)}</div>
          ) : studentRows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No students match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Latest</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentRows.map((r) => {
                    const Icon = r.delta > 0 ? TrendingUp : r.delta < 0 ? TrendingDown : Minus;
                    return (
                      <TableRow key={r.student.id}>
                        <TableCell className="font-medium">{r.student.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.className}</TableCell>
                        <TableCell className="text-right">{r.lessons}</TableCell>
                        <TableCell className="w-40"><div className="flex items-center gap-2"><Progress value={r.attRate} className="h-2" /><span className="text-xs w-10 text-right">{r.attRate}%</span></div></TableCell>
                        <TableCell className="text-right">{r.entries}</TableCell>
                        <TableCell className="text-right">{r.latest ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center gap-1 text-sm ${r.delta > 0 ? "text-emerald-500" : r.delta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            <Icon className="h-3.5 w-3.5" />{r.delta > 0 ? "+" : ""}{r.delta}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </CoachShell>
  );
}
