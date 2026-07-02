import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowRight, GraduationCap } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students · Rooky Coach" }] }),
  component: StudentsPage,
});

type ClassOpt = { id: string; name: string };
type StudentRow = { id: string; full_name: string; rating: number | null; class_id: string | null; className?: string | null };

const NO_CLASS = "__none__";

const schema = z.object({
  full_name: z.string().trim().min(1, "Name required").max(120),
  rating: z.number().int().min(0).max(4000).nullable(),
  class_id: z.string().nullable(),
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0]?.toUpperCase();
}

function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState<string>("__all__");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<{ full_name: string; rating: string; class_id: string | null }>({ full_name: "", rating: "", class_id: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: studs, error }, { data: cls }] = await Promise.all([
      supabase.from("students").select("id,full_name,rating,class_id").order("full_name"),
      supabase.from("classes").select("id,name").order("name"),
    ]);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setClasses((cls ?? []) as ClassOpt[]);
    const map = new Map((cls ?? []).map((c: any) => [c.id, c.name]));
    setRows((studs ?? []).map((s: any) => ({ ...s, className: s.class_id ? map.get(s.class_id) ?? null : null })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ full_name: "", rating: "", class_id: null });
    setOpen(true);
  }
  function openEdit(s: StudentRow) {
    setEditing(s);
    setForm({ full_name: s.full_name, rating: s.rating ? String(s.rating) : "", class_id: s.class_id });
    setOpen(true);
  }

  async function handleSave() {
    const ratingNum = form.rating.trim() === "" ? null : Number(form.rating);
    if (ratingNum != null && (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 4000)) {
      toast.error("Rating must be 0–4000"); return;
    }
    const parsed = schema.safeParse({ full_name: form.full_name, rating: ratingNum, class_id: form.class_id });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const payload = { full_name: parsed.data.full_name, rating: parsed.data.rating ?? 0, class_id: parsed.data.class_id, coach_id: uid };
    const res = editing
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Student updated" : "Student added");
    setOpen(false);
    void load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Student deleted");
    void load();
  }

  const filtered = rows.filter((r) => {
    if (classFilter !== "__all__" && r.class_id !== (classFilter === NO_CLASS ? null : classFilter)) return false;
    if (!q) return true;
    return (r.full_name + " " + (r.className ?? "")).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <CoachShell
      title="Students"
      subtitle="Your roster of rising players."
      actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add student</Button>}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="pl-9" />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All classes</SelectItem>
            <SelectItem value={NO_CLASS}>No class</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-background/70 backdrop-blur border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="text-5xl">♙</div>
            <p className="font-medium">No students yet</p>
            <p className="text-sm text-muted-foreground">Add your first student to start tracking progress.</p>
            <Button onClick={openCreate} className="mt-2"><Plus className="h-4 w-4" /> Add student</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {filtered.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(s.full_name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <Link to="/students/$id" params={{ id: s.id }} className="font-medium hover:text-primary transition-colors block truncate">{s.full_name}</Link>
                    {s.className && (
                      <Link to="/classes/$id" params={{ id: s.class_id! }} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> {s.className}
                      </Link>
                    )}
                  </div>
                  {s.rating != null && s.rating > 0 && <Badge variant="secondary" className="rounded-full">{s.rating}</Badge>}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to="/students/$id" params={{ id: s.id }}><ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {s.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove the student and their attendance, badges, and progress records.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
            <DialogDescription>{editing ? "Update this student's details." : "Add a new player to your roster."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sname">Full name</Label>
              <Input id="sname" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Alex Kim" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="srating">Rating (optional)</Label>
              <Input id="srating" type="number" min={0} max={4000} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="e.g. 1200" />
            </div>
            <div className="space-y-2">
              <Label>Class (optional)</Label>
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add student"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachShell>
  );
}
