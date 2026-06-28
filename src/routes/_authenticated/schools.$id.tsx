import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachShell } from "@/components/coach-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, GraduationCap, Users, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/schools/$id")({
  head: () => ({ meta: [{ title: "School · Rooky Coach" }] }),
  component: SchoolDetail,
});

type School = { id: string; name: string; address: string | null };
type ClassRow = { id: string; name: string; level: string | null; studentCount: number };

function SchoolDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: s, error } = await supabase.from("schools").select("id,name,address").eq("id", id).maybeSingle();
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!s) { toast.error("School not found"); navigate({ to: "/schools" }); return; }
    setSchool(s as School);
    const { data: cls } = await supabase.from("classes").select("id,name,level").eq("school_id", id).order("name");
    const ids = (cls ?? []).map((c: any) => c.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: studs } = await supabase.from("students").select("id,class_id").in("class_id", ids);
      (studs ?? []).forEach((st: any) => counts.set(st.class_id, (counts.get(st.class_id) ?? 0) + 1));
    }
    setClasses((cls ?? []).map((c: any) => ({ ...c, studentCount: counts.get(c.id) ?? 0 })));
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  return (
    <CoachShell
      title={school?.name ?? "School"}
      subtitle={school?.address ?? "School details"}
      actions={
        <Button variant="ghost" asChild>
          <Link to="/schools"><ArrowLeft className="h-4 w-4" /> All schools</Link>
        </Button>
      }
    >
      {school?.address && (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {school.address}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Classes at this school</h2>
        <Button asChild size="sm"><Link to="/classes"><Plus className="h-4 w-4" /> Add class</Link></Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <Card className="bg-background/70 backdrop-blur border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <div className="text-4xl">♘</div>
            <p className="text-sm text-muted-foreground">No classes assigned to this school yet.</p>
            <Button asChild size="sm" className="mt-2"><Link to="/classes"><Plus className="h-4 w-4" /> Add a class</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Card key={c.id} className="bg-background/70 backdrop-blur hover:shadow-lg transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary grid place-items-center"><GraduationCap className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <Link to="/classes/$id" params={{ id: c.id }} className="font-semibold hover:text-primary transition-colors">{c.name}</Link>
                    {c.level && <div className="text-xs text-muted-foreground">{c.level}</div>}
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full"><Users className="h-3 w-3 mr-1" />{c.studentCount} students</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CoachShell>
  );
}
