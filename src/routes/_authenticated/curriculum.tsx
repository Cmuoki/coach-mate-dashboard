import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollText, Save, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/curriculum")({
  head: () => ({ meta: [{ title: "Curriculum · Rooky Coach" }] }),
  component: CurriculumPage,
});

type Topic = { id: string; name: string; level: string | null };
type Klass = { id: string; name: string; level: string | null };
type Coverage = { topic_id: string; class_id: string | null; coverage_pct: number };

function CurriculumPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [pending, setPending] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: c }, { data: cov }] = await Promise.all([
      supabase.from("curriculum_topics").select("id,name,level").order("level").order("name"),
      supabase.from("classes").select("id,name,level").order("name"),
      supabase.from("topic_coverage").select("topic_id,class_id,coverage_pct"),
    ]);
    setTopics((t ?? []) as Topic[]);
    setClasses((c ?? []) as Klass[]);
    setCoverage((cov ?? []) as Coverage[]);
    if (!classId && c && c.length) setClassId(c[0].id);
    setLoading(false);
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  const currentMap = useMemo(() => {
    const m = new Map<string, number>();
    coverage.filter((r) => r.class_id === classId).forEach((r) => m.set(r.topic_id, r.coverage_pct));
    return m;
  }, [coverage, classId]);

  const avgByTopic = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    coverage.forEach((r) => {
      const cur = m.get(r.topic_id) ?? { sum: 0, n: 0 };
      cur.sum += r.coverage_pct; cur.n += 1;
      m.set(r.topic_id, cur);
    });
    return m;
  }, [coverage]);

  const filtered = topics.filter((t) => (t.name + " " + (t.level ?? "")).toLowerCase().includes(q.toLowerCase()));
  const grouped = filtered.reduce<Record<string, Topic[]>>((acc, t) => {
    const k = t.level ?? "General";
    (acc[k] ??= []).push(t);
    return acc;
  }, {});

  function setValue(topicId: string, v: number) {
    setPending((p) => ({ ...p, [topicId]: Math.max(0, Math.min(100, v)) }));
  }

  async function save() {
    if (!classId) { toast.error("Pick a class first"); return; }
    const entries = Object.entries(pending);
    if (!entries.length) { toast.info("No changes to save"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    // delete existing rows for these topics on this class, then insert fresh
    const topicIds = entries.map(([id]) => id);
    await supabase.from("topic_coverage").delete().eq("class_id", classId).in("topic_id", topicIds);
    const rows = entries.map(([topic_id, coverage_pct]) => ({ topic_id, class_id: classId, coverage_pct, coach_id: uid }));
    const { error } = await supabase.from("topic_coverage").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Saved ${entries.length} topic${entries.length === 1 ? "" : "s"}`);
    setPending({});
    void load();
  }

  const overall = classes.length && classId
    ? Math.round(
        topics.reduce((s, t) => s + (pending[t.id] ?? currentMap.get(t.id) ?? 0), 0) / Math.max(topics.length, 1)
      )
    : 0;

  return (
    <CoachShell
      title="Curriculum"
      subtitle="Track how far each class has marched through the syllabus."
      actions={
        <Button onClick={save} disabled={saving || !Object.keys(pending).length}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <Card className="bg-background/70 backdrop-blur border-border/60 h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Class</div>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setPending({}); }}>
                <SelectTrigger><SelectValue placeholder="Pick a class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.level ? ` · ${c.level}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Overall coverage</div>
              <div className="text-4xl font-black gradient-text leading-none">{overall}<span className="text-xl">%</span></div>
              <Progress value={overall} className="h-2" />
              <p className="text-xs text-muted-foreground">Average across {topics.length} topics.</p>
            </div>
            <div className="relative">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics…" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loading ? (
            <div className="grid gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <Card className="bg-background/70 backdrop-blur border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <div className="text-5xl">♟</div>
                <p className="font-medium">No topics found</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(grouped).map(([level, list]) => (
              <section key={level} className="space-y-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <h2 className="font-bold tracking-tight">{level}</h2>
                  <Badge variant="secondary" className="rounded-full">{list.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {list.map((t) => {
                    const current = pending[t.id] ?? currentMap.get(t.id) ?? 0;
                    const avg = avgByTopic.get(t.id);
                    const avgPct = avg ? Math.round(avg.sum / avg.n) : 0;
                    const dirty = pending[t.id] !== undefined;
                    return (
                      <Card key={t.id} className={`bg-background/70 backdrop-blur border-border/60 ${dirty ? "ring-1 ring-primary/40" : ""}`}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{t.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <Sparkles className="h-3 w-3" /> avg across classes: {avgPct}%
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-72">
                            <Progress value={current} className="h-2 flex-1" />
                            <Input
                              type="number" min={0} max={100} value={current}
                              onChange={(e) => setValue(t.id, Number(e.target.value))}
                              className="w-20 h-9 text-center"
                              disabled={!classId}
                            />
                            <span className="text-xs text-muted-foreground w-4">%</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </CoachShell>
  );
}
