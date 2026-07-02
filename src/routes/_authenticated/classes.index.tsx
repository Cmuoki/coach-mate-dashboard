import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, GraduationCap, ArrowRight, Search, Users, School as SchoolIcon } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes · Rooky Coach" }] }),
  component: ClassesPage,
});

type SchoolOpt = { id: string; name: string };
type ClassRow = {
  id: string; name: string; level: string | null; school_id: string | null;
  schoolName?: string | null; studentCount?: number;
};

const NO_SCHOOL = "__none__";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  level: z.string().trim().max(60).optional().or(z.literal("")),
  school_id: z.string().nullable(),
});

function ClassesPage() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [schools, setSchools] = useState<SchoolOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState<{ name: string; level: string; school_id: string | null }>({ name: "", level: "", school_id: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cls, error }, { data: sch }, { data: studs }] = await Promise.all([
      supabase.from("classes").select("id,name,level,school_id").order("created_at", { ascending: false }),
      supabase.from("schools").select("id,name").order("name"),
      supabase.from("students").select("id,class_id"),
    ]);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setSchools((sch ?? []) as SchoolOpt[]);
    const schoolMap = new Map((sch ?? []).map((s: any) => [s.id, s.name]));
    const counts = new Map<string, number>();
    (studs ?? []).forEach((s: any) => { if (s.class_id) counts.set(s.class_id, (counts.get(s.class_id) ?? 0) + 1); });
    setRows((cls ?? []).map((c: any) => ({
      ...c,
      schoolName: c.school_id ? schoolMap.get(c.school_id) ?? null : null,
      studentCount: counts.get(c.id) ?? 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", level: "", school_id: null });
    setOpen(true);
  }
  function openEdit(c: ClassRow) {
    setEditing(c);
    setForm({ name: c.name, level: c.level ?? "", school_id: c.school_id });
    setOpen(true);
  }

  async function handleSave() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const payload = {
      name: parsed.data.name,
      level: parsed.data.level || null,
      school_id: parsed.data.school_id,
      coach_id: uid,
    };
    const res = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Class updated" : "Class added");
    setOpen(false);
    void load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Class deleted");
    void load();
  }

  const filtered = rows.filter((r) => (r.name + " " + (r.level ?? "") + " " + (r.schoolName ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <CoachShell
      title="Classes"
      subtitle="Squads on the board — group your players by school and level."
      actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add class</Button>}
    >
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search classes…" className="pl-9" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-background/70 backdrop-blur border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="text-5xl">♘</div>
            <p className="font-medium">No classes yet</p>
            <p className="text-sm text-muted-foreground">Create your first class to start tracking lessons.</p>
            <Button onClick={openCreate} className="mt-2"><Plus className="h-4 w-4" /> Add class</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="bg-background/70 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary grid place-items-center">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to="/classes/$id" params={{ id: c.id }} className="font-semibold hover:text-primary transition-colors">{c.name}</Link>
                    {c.schoolName && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <SchoolIcon className="h-3 w-3 shrink-0" /> {c.schoolName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.level && <Badge variant="outline" className="rounded-full">{c.level}</Badge>}
                  <Badge variant="secondary" className="rounded-full"><Users className="h-3 w-3 mr-1" />{c.studentCount}</Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Link to="/classes/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                          <AlertDialogDescription>Students will be kept but lose their class link.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit class" : "Add class"}</DialogTitle>
            <DialogDescription>{editing ? "Update class details." : "Create a new class for your roster."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Name</Label>
              <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Year 5 Beginners" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clevel">Level (optional)</Label>
              <Input id="clevel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="e.g. Beginner, Intermediate" maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label>School (optional)</Label>
              <Select
                value={form.school_id ?? NO_SCHOOL}
                onValueChange={(v) => setForm({ ...form, school_id: v === NO_SCHOOL ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="No school" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SCHOOL}>No school</SelectItem>
                  {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add class"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachShell>
  );
}
