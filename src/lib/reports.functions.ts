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
