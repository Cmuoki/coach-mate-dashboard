import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress · Rooky Coach" }] }),
  component: ProgressPage,
});

type Student = { id: string; full_name: string; rating: number | null; class_id: string | null };
type Entry = { id: string; student_id: string; score: number; recorded_at: string };

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return <div className="h-8 w-24 text-xs text-muted-foreground grid place-items-center">no data</div>;
  const w = 96, h = 32, pad = 2;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const d = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="text-primary">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", score: "", recorded_at: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from("students").select("id,full_name,rating,class_id").order("full_name"),
      supabase.from("student_progress").select("id,student_id,score,recorded_at").order("recorded_at", { ascending: true }),
    ]);
    setStudents((s ?? []) as Student[]);
    setEntries((e ?? []) as Entry[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const byStudent = useMemo(() => {
    const m = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const arr = m.get(e.student_id) ?? [];
      arr.push(e);
      m.set(e.student_id, arr);
    });
    return m;
  }, [entries]);

  async function save() {
    if (!form.student_id) { toast.error("Pick a student"); return; }
    const score = Number(form.score);
    if (!Number.isFinite(score)) { toast.error("Score must be a number"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const { error } = await supabase.from("student_progress").insert({
      student_id: form.student_id, score, recorded_at: new Date(form.recorded_at).toISOString(), coach_id: uid,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Score logged");
    setOpen(false);
    setForm({ student_id: "", score: "", recorded_at: new Date().toISOString().slice(0, 10) });
    void load();
  }

  const withStats = students.map((s) => {
    const list = byStudent.get(s.id) ?? [];
    const scores = list.map((e) => e.score);
    const latest = scores[scores.length - 1];
    const prev = scores[scores.length - 2];
    const delta = latest !== undefined && prev !== undefined ? latest - prev : 0;
    return { s, scores, latest, delta, count: list.length };
  }).sort((a, b) => (b.count - a.count) || a.s.full_name.localeCompare(b.s.full_name));

  return (
    <CoachShell
      title="Progress"
      subtitle="Log ratings and watch the climb."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Log score</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a rating</DialogTitle>
              <DialogDescription>Record a student's rating or session score.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Score / rating</Label>
                  <Input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="e.g. 1200" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.recorded_at} onChange={(e) => setForm({ ...form, recorded_at: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : students.length === 0 ? (
        <Card className="bg-background/70 backdrop-blur border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="text-5xl">♟</div>
            <p className="font-medium">No students yet</p>
            <p className="text-sm text-muted-foreground">Add students first, then start logging their progress.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {withStats.map(({ s, scores, latest, delta, count }) => {
            const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
            const trendColor = delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground";
            return (
              <Card key={s.id} className="bg-background/70 backdrop-blur border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to="/students/$id" params={{ id: s.id }} className="font-semibold hover:text-primary transition-colors">{s.full_name}</Link>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">{count} entries</Badge>
                      {s.rating != null && <span>current rating {s.rating}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Sparkline points={scores} />
                    <div className="text-right w-24">
                      <div className="text-2xl font-black leading-none">{latest ?? "—"}</div>
                      <div className={`text-xs mt-0.5 flex items-center justify-end gap-1 ${trendColor}`}>
                        <Trend className="h-3 w-3" /> {delta > 0 ? `+${delta}` : delta}
                      </div>
                    </div>
                    <Link to="/students/$id" params={{ id: s.id }} className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CoachShell>
  );
}
