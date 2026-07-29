import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { Award, Download, Eye, Share2, Sparkles } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/EmptyState";
import { CertificateModal } from "@/components/student/CertificateModal";
import {
  courseProgress,
  flatLessons,
  issueCertificate,
  type Certificate,
} from "@/lib/lms-storage";
import { courses } from "@/lib/mock-data";
import {
  useEnrollmentIds,
  useIssuedCertificates,
  useProgress,
  useProfile, // مفترَض موجود حسب اتفاقية المشروع لجلب بيانات الجلسة
} from "@/hooks/useStudentData";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Certificates,
});

function Certificates() {
  const { t } = useTranslation();
  const session = useProfile(); // { name, email, ... } — يستبدل getProfile() المباشر
  const enrolledIds = useEnrollmentIds();
  useProgress(); // subscribe to progress updates so completions are picked up
  const issued = useIssuedCertificates();

  const [selected, setSelected] = useState<Certificate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-issue certificates for any course now at 100%
  useEffect(() => {
    for (const id of enrolledIds) {
      const c = courses.find((x) => x.id === id);
      if (!c) continue;
      const total = flatLessons(id).length;
      if (courseProgress(id, total).pct === 100) {
        issueCertificate({ id: c.id, title: c.title, teacher: c.teacher });
      }
    }
  }, [enrolledIds]);

  const list = useMemo(() => issued, [issued]);

  // الكورسات القريبة من الإكمال (In Progress) — مسجَّل بها الطالب وليست مكتملة 100%
  const inProgress = useMemo(() => {
    return enrolledIds
      .map((id) => {
        const c = courses.find((x) => x.id === id);
        if (!c) return null;
        const total = flatLessons(id).length;
        const { pct } = courseProgress(id, total);
        return pct < 100 ? { course: c, pct } : null;
      })
      .filter((x): x is { course: (typeof courses)[number]; pct: number } => x !== null)
      .sort((a, b) => b.pct - a.pct);
  }, [enrolledIds]);

  const openPreview = (c: Certificate) => {
    setSelected(c);
    setModalOpen(true);
  };

  const download = (c: Certificate) => {
    const blob = new Blob(
      [
        `LUMEN LMS — Certificate of Completion\n\nAwarded to: ${session.name}\nCourse: ${c.course}\nCredential: ${c.credential}\nIssued: ${c.issued}\n`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.credential}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("student.certificateDownloaded"));
  };

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title={t("student.certificatesTitle")}
        description={t("student.certificatesDescPage")}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("student.noCertificatesYet")}
          description={t("student.certificatesEmptyDesc")}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} className="overflow-hidden border-border/60 p-0 shadow-card">
              <div className="gradient-brand p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Award className="h-4 w-4" /> {t("student.certificateOfCompletion")}
                  </div>
                  <Badge className="bg-white/20 text-white hover:bg-white/20 border-transparent">{t("student.verified")}</Badge>
                </div>
                <p className="mt-6 text-xs uppercase tracking-widest opacity-80">{t("student.awardedTo")}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{session.name}</p>
                <p className="mt-4 text-xs uppercase tracking-widest opacity-80">{t("student.forCompleting")}</p>
                <p className="mt-1 text-lg font-medium">{c.course}</p>
                {c.teacher && (
                  <p className="mt-1 text-xs opacity-80">{t("student.instructorLabel")}: {c.teacher}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4">
                <div className="text-xs text-muted-foreground">
                  <p>{t("student.issuedOn")} {c.issued}</p>
                  <p className="font-mono">{c.credential}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPreview(c)}>
                    <Eye className="mr-1.5 h-4 w-4" /> {t("student.view")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => download(c)}>
                    <Download className="mr-1.5 h-4 w-4" /> {t("student.download")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${c.credential} · ${c.course}`);
                      toast.success(t("student.shareLinkCopied"));
                    }}
                  >
                    <Share2 className="mr-1.5 h-4 w-4" /> {t("student.share")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t("student.upcomingCertificates")}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {inProgress.map(({ course, pct }) => (
              <Card key={course.id} className="border-border/60 p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{course.title}</p>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={pct} className="mt-3 h-2" />
              </Card>
            ))}
          </div>
        </div>
      )}

      <CertificateModal
        certificate={selected}
        studentName={session.name}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </RoleDashboardLayout>
  );
}