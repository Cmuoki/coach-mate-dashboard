import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, School as SchoolIcon, ArrowRight, Search } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/schools")({
  head: () => ({ meta: [{ title: "Schools · Rooky Coach" }] }),
  component: SchoolsPage,
});

type SchoolRow = { id: string; name: string; address: string | null; created_at: string; classCount?: number; studentCount?: number };

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

function SchoolsPage() {
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data: schools, error } = await supabase
      .from("schools").select("id,name,address,created_at").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const [{ data: cls }, { data: studs }] = await Promise.all([
      supabase.from("classes").select("id,school_id"),
      supabase.from("students").select("id,class_id"),
    ]);
    const classBySchool = new Map<string, string[]>();
    (cls ?? []).forEach((c: any) => {
      if (!c.school_id) return;
      const arr = classBySchool.get(c.school_id) ?? [];
      arr.push(c.id);
      classBySchool.set(c.school_id, arr);
    });
    const studentsByClass = new Map<string, number>();
    (studs ?? []).forEach((s: any) => {
      if (!s.class_id) return;
      studentsByClass.set(s.class_id, (studentsByClass.get(s.class_id) ?? 0) + 1);
    });
    setRows((schools ?? []).map((s: any) => {
      const classIds = classBySchool.get(s.id) ?? [];
      const studentCount = classIds.reduce((sum, id) => sum + (studentsByClass.get(id) ?? 0), 0);
      return { ...s, classCount: classIds.length, studentCount };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", address: "" });
    setOpen(true);
  }
  function openEdit(s: SchoolRow) {
    setEditing(s);
    setForm({ name: s.name, address: s.address ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const payload = { name: parsed.data.name, address: parsed.data.address || null, coach_id: uid };
    const res = editing
      ? await supabase.from("schools").update(payload).eq("id", editing.id)
      : await supabase.from("schools").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "School updated" : "School added");
    setOpen(false);
    void load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("schools").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("School deleted");
    void load();
  }

  const filtered = rows.filter((r) => (r.name + " " + (r.address ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <CoachShell
      title="Schools"
      subtitle="The kingdoms where your programmes run."
      actions={
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add school</Button>
      }
    >
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schools…" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-background/70 backdrop-blur border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="text-5xl">♜</div>
            <p className="font-medium">No schools yet</p>
            <p className="text-sm text-muted-foreground">Add the first school where you coach.</p>
            <Button onClick={openCreate} className="mt-2"><Plus className="h-4 w-4" /> Add school</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="group bg-background/70 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary grid place-items-center shrink-0">
                      <SchoolIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <Link to="/schools/$id" params={{ id: s.id }} className="font-semibold leading-tight hover:text-primary transition-colors">
                        {s.name}
                      </Link>
                      {s.address && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> <span className="line-clamp-2">{s.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">{s.classCount} classes</Badge>
                  <Badge variant="secondary" className="rounded-full">{s.studentCount} students</Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Link to="/schools/$id" params={{ id: s.id }} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the school. Classes will be kept but lose their school link.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
            <DialogTitle>{editing ? "Edit school" : "Add school"}</DialogTitle>
            <DialogDescription>{editing ? "Update this school's details." : "Add a new school to your roster."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. St. Mary's Primary" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Textarea id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, city" maxLength={500} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add school"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachShell>
  );
}
