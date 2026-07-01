import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, Sparkles, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({ meta: [{ title: "Badges · Rooky Coach" }] }),
  component: BadgesPage,
});

type BadgeRow = { id: string; name: string; description: string | null; icon: string | null };
type StudentRow = { id: string; full_name: string };
type Award = { id: string; badge_id: string; student_id: string; awarded_at: string };

function BadgesPage() {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [awardFor, setAwardFor] = useState<BadgeRow | null>(null);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: s }, { data: a }] = await Promise.all([
      supabase.from("badges").select("id,name,description,icon").order("name"),
      supabase.from("students").select("id,full_name").order("full_name"),
      supabase.from("student_badges").select("id,badge_id,student_id,awarded_at").order("awarded_at", { ascending: false }),
    ]);
    setBadges((b ?? []) as BadgeRow[]);
    setStudents((s ?? []) as StudentRow[]);
    setAwards((a ?? []) as Award[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const countByBadge = useMemo(() => {
    const m = new Map<string, number>();
    awards.forEach((a) => m.set(a.badge_id, (m.get(a.badge_id) ?? 0) + 1));
    return m;
  }, [awards]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s.full_name])), [students]);
  const badgeById = useMemo(() => new Map(badges.map((b) => [b.id, b])), [badges]);

  function openAward(b: BadgeRow) {
    setAwardFor(b);
    setPick({});
    setQ("");
  }

  async function grant() {
    if (!awardFor) return;
    const ids = Object.entries(pick).filter(([, v]) => v).map(([k]) => k);
    if (!ids.length) { toast.error("Pick at least one student"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const rows = ids.map((sid) => ({ badge_id: awardFor.id, student_id: sid, coach_id: uid }));
    const { error } = await supabase.from("student_badges").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Awarded to ${ids.length} student${ids.length === 1 ? "" : "s"}`);
    setAwardFor(null);
    void load();
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("student_badges").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Award removed");
    void load();
  }

  const studentFilter = students.filter((s) => s.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <CoachShell
      title="Badges"
      subtitle="Crown the wins. Award medals worth remembering."
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Catalogue</h2>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-muted/40 animate-pulse" />)}</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((b) => (
                <Card key={b.id} className="group bg-background/70 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all border-border/60">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary grid place-items-center text-3xl shrink-0 shadow-inner">
                        {b.icon || "🏅"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold leading-tight">{b.name}</div>
                        {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <UIBadge variant="secondary" className="rounded-full">
                        <Sparkles className="h-3 w-3 mr-1" /> {countByBadge.get(b.id) ?? 0} awarded
                      </UIBadge>
                      <Button size="sm" onClick={() => openAward(b)}>
                        <Award className="h-4 w-4" /> Award
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Recent awards</h2>
          <Card className="bg-background/70 backdrop-blur border-border/60">
            <CardContent className="p-0 divide-y divide-border/40">
              {awards.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No awards yet — start crowning your students.</div>
              ) : awards.slice(0, 20).map((a) => {
                const b = badgeById.get(a.badge_id);
                return (
                  <div key={a.id} className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center text-lg">{b?.icon || "🏅"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{studentById.get(a.student_id) ?? "Unknown student"}</div>
                      <div className="text-xs text-muted-foreground">{b?.name ?? "Badge"} · {new Date(a.awarded_at).toLocaleDateString()}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => revoke(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={!!awardFor} onOpenChange={(o) => !o && setAwardFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{awardFor?.icon || "🏅"}</span> Award "{awardFor?.name}"
            </DialogTitle>
            <DialogDescription>Pick the students who earned it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40">
              {studentFilter.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No students match.</div>
              ) : studentFilter.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer">
                  <Checkbox checked={!!pick[s.id]} onCheckedChange={(v) => setPick((p) => ({ ...p, [s.id]: !!v }))} />
                  <span className="text-sm">{s.full_name}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">{Object.values(pick).filter(Boolean).length} selected</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAwardFor(null)}>Cancel</Button>
            <Button onClick={grant} disabled={saving}>{saving ? "Awarding…" : "Award badge"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachShell>
  );
}
