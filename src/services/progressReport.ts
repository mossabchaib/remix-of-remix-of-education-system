import { logActivity, type Progress } from "@/lib/lms-storage";

export type CourseRow = {
  id: string;
  title: string;
  teacher: string;
  level: string;
  done: number;
  total: number;
  pct: number;
};

export type ReportPayload = {
  rangeLabel: string;
  avgProgress: number;
  doneLessons: number;
  totalLessons: number;
  avgQuizScore: number;
  quizzesTaken: number;
  totalQuizzes: number;
  submittedAssignments: number;
  totalAssignments: number;
  certificatesCount: number;
  rows: CourseRow[];
};

function escapeCsv(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildReportCsv(p: ReportPayload): string {
  const lines: string[] = [];
  lines.push(`Lumen LMS — Progress report (${p.rangeLabel})`);
  lines.push("");
  lines.push("Metric,Value");
  lines.push(`Average progress,${p.avgProgress}%`);
  lines.push(`Lessons completed,${p.doneLessons}/${p.totalLessons}`);
  lines.push(`Quiz average (in range),${p.avgQuizScore}%`);
  lines.push(`Quizzes taken (in range),${p.quizzesTaken}/${p.totalQuizzes}`);
  lines.push(`Assignments submitted (in range),${p.submittedAssignments}/${p.totalAssignments}`);
  lines.push(`Certificates earned,${p.certificatesCount}`);
  lines.push("");
  lines.push("Course,Teacher,Level,Lessons done,Lessons total,Progress %");
  for (const r of p.rows) {
    lines.push(
      [r.title, r.teacher, r.level, r.done, r.total, r.pct]
        .map(escapeCsv)
        .join(",")
    );
  }
  return lines.join("\n");
}

/** يولّد ويحمّل تقرير CSV على جهاز الطالب. عملية قراءة/تصدير فقط، لا تكتب أي شيء بالـ storage. */
export function exportProgressReport(payload: ReportPayload) {
  const csv = buildReportCsv(payload);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lumen-progress-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  logActivity({ kind: "certificate", label: "Exported progress report", refId: payload.rangeLabel });
}

/** مساعد: نسبة إكمال الدروس بدون timestamp — تبقى قراءة مباشرة من Progress، لا فلترة زمنية ممكنة هنا. */
export function totalDoneFromProgress(progress: Progress, courseIds: string[]) {
  return courseIds.reduce((sum, id) => sum + Object.values(progress[id] ?? {}).filter(Boolean).length, 0);
}