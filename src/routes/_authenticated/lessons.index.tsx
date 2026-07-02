import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar as CalIcon, ArrowRight, Search, BookOpen, ClipboardCheck } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/lessons/")({
  head: () => ({ meta: [{ title: "Lessons · Rooky Coach" }] }),
  component: LessonsPage,
});

type ClassOpt = { id: string; name: string; school_id: string | null };
type LessonRow = {
  id: string; topic: string | null; notes: string | null;
  lesson_date: string; class_id: string | null; school_id: string | null;
  className?: string | null; attendanceCount?: number; rosterCount?: number;
};

const NO_CLASS = "__none__";

const schema = z.object({
  topic: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  class_id: z.string().nullable(),
  lesson_date: z.string().min(1, "Date required"),
});

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function LessonsPage() {
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [form, setForm] = useState({ topic: "", notes: "", class_id: null as string | null, lesson_date: toLocalInput(new Date()) });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ls, error }, { data: cls }, { data: studs }, { data: att }] = await Promise.all([
      supabase.from("lessons").select("id,topic,notes,lesson_date,class_id,school_id").order("lesson_date", { ascending: false }),
      supabase.from("classes").select("id,name,school_id").order("name"),
      supabase.from("students").select("id,class_id"),
      supabase.from("attendance").select("lesson_id,status"),
    ]);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setClasses((cls ?? []) as ClassOpt[]);
    const clsMap = new Map((cls ?? []).map((c: any) => [c.id, c.name]));
    const rosterByClass = new Map<string, number>();
    (studs ?? []).forEach((s: any) => { if (s.class_id) rosterByClass.set(s.class_id, (rosterByClass.get(s.class_id) ?? 0) + 1); });
    const presentByLesson = new Map<string, number>();
    (att ?? []).forEach((a: any) => { if (a.status === "present") presentByLesson.set(a.lesson_id, (presentByLesson.get(a.lesson_id) ?? 0) + 1); });
    setRows((ls ?? []).map((l: any) => ({
      ...l,
      className: l.class_id ? clsMap.get(l.class_id) ?? null : null,
      attendanceCount: presentByLesson.get(l.id) ?? 0,
      rosterCount: l.class_id ? rosterByClass.get(l.class_id) ?? 0 : 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ topic: "", notes: "", class_id: null, lesson_date: toLocalInput(new Date()) });
    setOpen(true);
  }
  function openEdit(l: LessonRow) {
    setEditing(l);
    setForm({
      topic: l.topic ?? "",
      notes: l.notes ?? "",
      class_id: l.class_id,
      lesson_date: toLocalInput(new Date(l.lesson_date)),
    });
    setOpen(true);
  }

  async function handleSave() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const cls = classes.find((c) => c.id === parsed.data.class_id);
    const payload = {
      topic: parsed.data.topic || null,
      notes: parsed.data.notes || null,
      class_id: parsed.data.class_id,
      school_id: cls?.school_id ?? null,
      lesson_date: new Date(parsed.data.lesson_date).toISOString(),
      coach_id: uid,
    };
    const res = editing
      ? await supabase.from("lessons").update(payload).eq("id", editing.id)
      : await supabase.from("lessons").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Lesson updated" : "Lesson scheduled");
    setOpen(false);
    void load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson deleted");
    void load();
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterClass !== "all" && r.class_id !== filterClass) return false;
    const blob = `${r.topic ?? ""} ${r.notes ?? ""} ${r.className ?? ""}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  }), [rows, q, filterClass]);

  const now = Date.now();
  const upcoming = filtered.filter((l) => new Date(l.lesson_date).getTime() >= now);
  const past = filtered.filter((l) => new Date(l.lesson_date).getTime() < now);

  return (
    <CoachShell
      title="Lessons"
      subtitle="Plan the openings, log the games — every session your students play."
      actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Log lesson</Button>}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons…" className="pl-9" />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-background/70 backdrop-blur border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="text-5xl">♟</div>
            <p className="font-medium">No lessons yet</p>
            <p className="text-sm text-muted-foreground">Schedule your first lesson to start tracking attendance.</p>
            <Button onClick={openCreate} className="mt-2"><Plus className="h-4 w-4" /> Log lesson</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length} items={upcoming} onEdit={openEdit} onDelete={handleDelete} />
          )}
          {past.length > 0 && (
            <Section title="Past" count={past.length} items={past} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit lesson" : "Log lesson"}</DialogTitle>
            <DialogDescription>{editing ? "Update lesson details." : "Schedule a new lesson or log a past one."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={form.class_id ?? NO_CLASS}
                onValueChange={(v) => setForm({ ...form, class_id: v === NO_CLASS ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="No class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLASS}>No class</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ldate">Date & time</Label>
              <Input id="ldate" type="datetime-local" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ltopic">Topic (optional)</Label>
              <Input id="ltopic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Knight forks" maxLength={160} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lnotes">Notes (optional)</Label>
              <Textarea id="lnotes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything to remember…" maxLength={2000} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Log lesson"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachShell>
  );
}

function Section({ title, count, items, onEdit, onDelete }: {
  title: string; count: number; items: LessonRow[];
  onEdit: (l: LessonRow) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-lg">{title}</h2>
        <Badge variant="secondary" className="rounded-full">{count}</Badge>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((l) => (
          <Card key={l.id} className="bg-background/70 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all border-border/60">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary grid place-items-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/lessons/$id" params={{ id: l.id }} className="font-semibold hover:text-primary transition-colors line-clamp-1">{l.topic || "Lesson"}</Link>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <CalIcon className="h-3 w-3" /> {fmt(l.lesson_date)} · {fmtTime(l.lesson_date)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {l.className && <Badge variant="outline" className="rounded-full">{l.className}</Badge>}
                {l.rosterCount! > 0 && (
                  <Badge variant="secondary" className="rounded-full">
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    {l.attendanceCount}/{l.rosterCount}
                  </Badge>
                )}
              </div>
              {l.notes && <p className="text-xs text-muted-foreground line-clamp-2">{l.notes}</p>}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Link to="/lessons/$id" params={{ id: l.id }} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Take register <ArrowRight className="h-3 w-3" />
                </Link>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                        <AlertDialogDescription>Attendance records for this lesson will be removed too.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(l.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
