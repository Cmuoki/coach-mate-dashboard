import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ReportInput = {
  termLabel: string;
  scope: string;
  totals: { classes: number; lessons: number; attendancePct: number; coveragePct: number };
  classes: Array<{ name: string; level: string | null; students: number; lessons: number; attRate: number; covPct: number; avgDelta: number }>;
  students: Array<{ name: string; className: string; lessons: number; attRate: number; entries: number; latest: number | null; delta: number }>;
  focus?: string;
};

export const generateNarrativeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ReportInput) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are a chess coaching assistant writing a concise term report for a coach.

Term: ${data.termLabel}
Scope: ${data.scope}
${data.focus ? `Focus area from coach: ${data.focus}` : ""}

Totals: ${data.totals.classes} classes, ${data.totals.lessons} lessons, avg attendance ${data.totals.attendancePct}%, avg curriculum coverage ${data.totals.coveragePct}%.

Per-class data (JSON):
${JSON.stringify(data.classes, null, 2)}

Per-student data (JSON):
${JSON.stringify(data.students, null, 2)}

Write a clear markdown report with these sections:
1. **Executive summary** (2-3 sentences).
2. **Attendance highlights** — call out best and weakest classes/students.
3. **Curriculum coverage** — where we're on track and where we're behind.
4. **Progress trends** — students improving vs those needing support.
5. **Recommended next actions** — 3-5 specific, actionable bullets.

Keep it under 500 words. Be specific, use names and numbers. Do not invent data.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Lovable Cloud.");
      throw new Error(`AI gateway error: ${text}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    return { report: content as string };
  });

type StudentReportInput = {
  student: { name: string; className: string | null; rating: number | null };
  attendance: { total: number; present: number; late: number; absent: number };
  progress: Array<{ score: number; recorded_at: string }>;
  badges: Array<{ name: string; awarded_at: string }>;
  recentLessons: Array<{ topic: string | null; date: string; status: string | null }>;
  focus?: string;
};

export const generateStudentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: StudentReportInput) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const attPct = data.attendance.total
      ? Math.round(((data.attendance.present + data.attendance.late) / data.attendance.total) * 100)
      : 0;
    const scores = data.progress.map((p) => p.score);
    const delta = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;

    const prompt = `You are a chess coaching assistant writing a personal progress report about ONE student for their coach.

Student: ${data.student.name}
Class: ${data.student.className ?? "Unassigned"}
Current rating: ${data.student.rating ?? "unrated"}
${data.focus ? `Coach focus: ${data.focus}` : ""}

Attendance: ${data.attendance.present} present, ${data.attendance.late} late, ${data.attendance.absent} absent (of ${data.attendance.total} lessons) — ${attPct}%.

Progress entries (most recent first, JSON):
${JSON.stringify(data.progress, null, 2)}
Change from first→latest recorded: ${delta > 0 ? "+" : ""}${delta}

Badges awarded (JSON):
${JSON.stringify(data.badges, null, 2)}

Recent lessons and their attendance status (JSON):
${JSON.stringify(data.recentLessons, null, 2)}

Write a warm, specific markdown report the coach could share with the parent. Use these sections:
1. **Snapshot** — 2 sentences on where the student is right now.
2. **Attendance & engagement** — call out the pattern.
3. **Chess progress** — reference actual scores/deltas and badges.
4. **Strengths** — 2-3 bullets.
5. **Areas to work on** — 2-3 bullets.
6. **Coach's next steps** — 3 concrete actions for the next few weeks.

Under 400 words. Use the student's first name. Never invent data — if a section has no data, say so briefly.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Lovable Cloud.");
      throw new Error(`AI gateway error: ${text}`);
    }

    const json = await res.json();
    return { report: (json.choices?.[0]?.message?.content ?? "") as string };
  });
