import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Users, BookOpen, Calendar, School as SchoolIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/classes/$id")({
  head: () => ({ meta: [{ title: "Class · Rooky Coach" }] }),
  component: ClassDetail,
});

type Cls = { id: string; name: string; level: string | null; school_id: string | null; schoolName?: string | null };
type Student = { id: string; full_name: string; rating: number | null };
type Lesson = { id: string; topic: string | null; lesson_date: string; notes: string | null };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0]?.toUpperCase();
}

function ClassDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState<Cls | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: c, error } = await supabase.from("classes").select("id,name,level,school_id").eq("id", id).maybeSingle();
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!c) { toast.error("Class not found"); navigate({ to: "/classes" }); return; }
    let schoolName: string | null = null;
    if (c.school_id) {
      const { data: s } = await supabase.from("schools").select("name").eq("id", c.school_id).maybeSingle();
      schoolName = s?.name ?? null;
    }
    setCls({ ...(c as Cls), schoolName });
    const [{ data: st }, { data: ls }] = await Promise.all([
      supabase.from("students").select("id,full_name,rating").eq("class_id", id).order("full_name"),
      supabase.from("lessons").select("id,topic,lesson_date,notes").eq("class_id", id).order("lesson_date", { ascending: false }).limit(10),
    ]);
    setStudents((st ?? []) as Student[]);
    setLessons((ls ?? []) as Lesson[]);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  return (
    <CoachShell
      title={cls?.name ?? "Class"}
      subtitle={cls?.level ?? "Class details"}
      actions={<Button variant="ghost" asChild><Link to="/classes"><ArrowLeft className="h-4 w-4" /> All classes</Link></Button>}
    >
      {cls?.schoolName && (
        <Link to="/schools/$id" params={{ id: cls.school_id! }} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
          <SchoolIcon className="h-3.5 w-3.5" /> {cls.schoolName}
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-background/70 backdrop-blur">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Roster ({students.length})</h2>
              <Button asChild size="sm" variant="outline"><Link to="/students">Manage students</Link></Button>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />)}</div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <div className="text-3xl mb-2">♙</div>
                No students in this class yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {students.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                    <Link to="/students/$id" params={{ id: s.id }} className="flex items-center gap-3 min-w-0 hover:text-primary transition-colors">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(s.full_name)}</AvatarFallback></Avatar>
                      <span className="font-medium truncate">{s.full_name}</span>
                    </Link>
                    {s.rating != null && s.rating > 0 && <Badge variant="secondary" className="rounded-full">{s.rating}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/70 backdrop-blur">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Recent lessons</h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />)}</div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No lessons logged yet.</div>
            ) : (
              <ul className="space-y-3">
                {lessons.map((l) => (
                  <li key={l.id} className="rounded-lg border border-border/60 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{l.topic || "Lesson"}</span>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" />{fmtDate(l.lesson_date)}</span>
                    </div>
                    {l.notes && <p className="text-xs text-muted-foreground line-clamp-2">{l.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </CoachShell>
  );
}
