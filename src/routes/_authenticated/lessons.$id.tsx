import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar as CalIcon, BookOpen, ClipboardCheck, Save, Trash2, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/lessons/$id")({
  head: () => ({ meta: [{ title: "Lesson · Rooky Coach" }] }),
  component: LessonDetail,
});

type Lesson = {
  id: string; topic: string | null; notes: string | null; lesson_date: string;
  class_id: string | null; school_id: string | null;
  className?: string | null;
};
type Student = { id: string; full_name: string; rating: number | null };
type Status = "present" | "absent" | "late";

const STATUSES: { value: Status; label: string; icon: typeof Check; cls: string }[] = [
  { value: "present", label: "Present", icon: Check, cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { value: "late", label: "Late", icon: Clock, cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "absent", label: "Absent", icon: X, cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0]?.toUpperCase();
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function LessonDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [initial, setInitial] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // editable lesson fields
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [dateStr, setDateStr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: l, error } = await supabase.from("lessons")
      .select("id,topic,notes,lesson_date,class_id,school_id").eq("id", id).maybeSingle();
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!l) { toast.error("Lesson not found"); navigate({ to: "/lessons" }); return; }

    let className: string | null = null;
    let studs: Student[] = [];
    if (l.class_id) {
      const [{ data: c }, { data: st }] = await Promise.all([
        supabase.from("classes").select("name").eq("id", l.class_id).maybeSingle(),
        supabase.from("students").select("id,full_name,rating").eq("class_id", l.class_id).order("full_name"),
      ]);
      className = c?.name ?? null;
      studs = (st ?? []) as Student[];
    }
    const { data: att } = await supabase.from("attendance")
      .select("student_id,status").eq("lesson_id", id);
    const map: Record<string, Status> = {};
    (att ?? []).forEach((a: any) => { map[a.student_id] = (a.status as Status) || "present"; });

    setLesson({ ...(l as Lesson), className });
    setStudents(studs);
    setAttendance(map);
    setInitial(map);
    setTopic(l.topic ?? "");
    setNotes(l.notes ?? "");
    setDateStr(toLocalInput(new Date(l.lesson_date)));
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  function setStatus(studentId: string, status: Status) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  }

  const dirty = useMemo(() => {
    if (!lesson) return false;
    if (topic !== (lesson.topic ?? "")) return true;
    if (notes !== (lesson.notes ?? "")) return true;
    if (dateStr !== toLocalInput(new Date(lesson.lesson_date))) return true;
    const keys = new Set([...Object.keys(attendance), ...Object.keys(initial)]);
    for (const k of keys) if (attendance[k] !== initial[k]) return true;
    return false;
  }, [lesson, topic, notes, dateStr, attendance, initial]);

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, unmarked: 0 };
    students.forEach((s) => {
      const st = attendance[s.id];
      if (!st) c.unmarked++; else (c as any)[st]++;
    });
    return c;
  }, [students, attendance]);

  function markAll(status: Status) {
    const next: Record<string, Status> = { ...attendance };
    students.forEach((s) => { next[s.id] = status; });
    setAttendance(next);
  }

  async function handleSave() {
    if (!lesson) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }

    // lesson update
    const lessonChanged =
      topic !== (lesson.topic ?? "") ||
      notes !== (lesson.notes ?? "") ||
      dateStr !== toLocalInput(new Date(lesson.lesson_date));
    if (lessonChanged) {
      const { error } = await supabase.from("lessons").update({
        topic: topic.trim() || null,
        notes: notes.trim() || null,
        lesson_date: new Date(dateStr).toISOString(),
      }).eq("id", lesson.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    // attendance diff
    const toUpsert: { lesson_id: string; student_id: string; status: Status; coach_id: string }[] = [];
    const toDelete: string[] = [];
    const keys = new Set([...Object.keys(attendance), ...Object.keys(initial)]);
    for (const k of keys) {
      const cur = attendance[k];
      const prev = initial[k];
      if (cur && cur !== prev) toUpsert.push({ lesson_id: lesson.id, student_id: k, status: cur, coach_id: uid });
      else if (!cur && prev) toDelete.push(k);
    }
    if (toUpsert.length) {
      const { error } = await supabase.from("attendance").upsert(toUpsert, { onConflict: "lesson_id,student_id" });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    if (toDelete.length) {
      const { error } = await supabase.from("attendance").delete().eq("lesson_id", lesson.id).in("student_id", toDelete);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success("Lesson saved");
    setSaving(false);
    void load();
  }

  async function handleDelete() {
    if (!lesson) return;
    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson deleted");
    navigate({ to: "/lessons" });
  }

  return (
    <CoachShell
      title={lesson?.topic || "Lesson"}
      subtitle={lesson ? `${fmt(lesson.lesson_date)} · ${fmtTime(lesson.lesson_date)}` : "Lesson details"}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/lessons"><ArrowLeft className="h-4 w-4" /> All lessons</Link></Button>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      {lesson?.className && (
        <Link to="/classes/$id" params={{ id: lesson.class_id! }} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
          <BookOpen className="h-3.5 w-3.5" /> {lesson.className}
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-background/70 backdrop-blur">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Attendance register</h2>
              <div className="flex items-center gap-2 text-xs">
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 rounded-full" variant="outline">{counts.present} present</Badge>
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 rounded-full" variant="outline">{counts.late} late</Badge>
                <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 rounded-full" variant="outline">{counts.absent} absent</Badge>
                {counts.unmarked > 0 && <Badge variant="secondary" className="rounded-full">{counts.unmarked} unmarked</Badge>}
              </div>
            </div>

            {students.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => markAll("present")}><Check className="h-3.5 w-3.5" /> Mark all present</Button>
                <Button size="sm" variant="outline" onClick={() => markAll("absent")}><X className="h-3.5 w-3.5" /> Mark all absent</Button>
              </div>
            )}

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />)}</div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground space-y-2">
                <div className="text-4xl">♙</div>
                <p>{lesson?.class_id ? "No students in this class yet." : "Attach this lesson to a class to take attendance."}</p>
                {!lesson?.class_id && <Button asChild size="sm" variant="outline"><Link to="/lessons">Edit lesson</Link></Button>}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {students.map((s) => {
                  const cur = attendance[s.id];
                  return (
                    <li key={s.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                      <Link to="/students/$id" params={{ id: s.id }} className="flex items-center gap-3 min-w-0 hover:text-primary transition-colors">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(s.full_name)}</AvatarFallback></Avatar>
                        <span className="font-medium truncate">{s.full_name}</span>
                        {s.rating != null && s.rating > 0 && <Badge variant="secondary" className="rounded-full text-xs">{s.rating}</Badge>}
                      </Link>
                      <div className="flex items-center gap-1">
                        {STATUSES.map((opt) => {
                          const Icon = opt.icon;
                          const active = cur === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setStatus(s.id, opt.value)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors ${active ? opt.cls : "border-border/60 text-muted-foreground hover:bg-muted/60"}`}
                            >
                              <Icon className="h-3.5 w-3.5" /> {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-background/70 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Lesson details</h2>
              <div className="space-y-2">
                <Label htmlFor="ld">Date & time</Label>
                <Input id="ld" type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt">Topic</Label>
                <Input id="lt" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Pawn endgames" maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln">Notes</Label>
                <Textarea id="ln" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" maxLength={2000} rows={6} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/70 backdrop-blur border-destructive/30">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-sm text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger zone</h3>
              <p className="text-xs text-muted-foreground">Deleting a lesson also removes its attendance records.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full"><Trash2 className="h-4 w-4" /> Delete lesson</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                    <AlertDialogDescription>This will remove the lesson and all attendance records for it.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {lesson && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CalIcon className="h-3 w-3" /> {fmt(lesson.lesson_date)}
            </div>
          )}
        </div>
      </div>
    </CoachShell>
  );
}
