import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Award, Download, Share2, Sparkles } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import {
  getProfile,
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
} from "@/hooks/useStudentData";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Certificates,
});

function Certificates() {
  const profile = getProfile();
  const enrolledIds = useEnrollmentIds();
  useProgress(); // subscribe to progress updates so completions are picked up
  const issued = useIssuedCertificates();

  // Auto-issue certificates for any course now at 100%
  useEffect(() => {
    for (const id of enrolledIds) {
      const c = courses.find((x) => x.id === id);
      if (!c) continue;
      const total = flatLessons(id).length;
      if (courseProgress(id, total).pct === 100) issueCertificate({ id: c.id, title: c.title });
    }
  }, [enrolledIds]);

  const list = useMemo(() => issued, [issued]);

  const download = (c: Certificate) => {
    const blob = new Blob([
      `LUMEN LMS — Certificate of Completion\n\nAwarded to: ${profile.name}\nCourse: ${c.course}\nCredential: ${c.credential}\nIssued: ${c.issued}\n`,
    ], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.credential}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Certificate downloaded");
  };

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Certificates"
        description="Your completed courses and issued credentials."
      />
      {list.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No certificates yet"
          description="Complete all lessons in a course to earn a certificate."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} className="overflow-hidden border-border/60 p-0 shadow-card">
              <div className="gradient-brand p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Award className="h-4 w-4" /> Certificate of completion
                  </div>
                  <Badge className="bg-white/20 text-white hover:bg-white/20 border-transparent">Verified</Badge>
                </div>
                <p className="mt-6 text-xs uppercase tracking-widest opacity-80">Awarded to</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{profile.name}</p>
                <p className="mt-4 text-xs uppercase tracking-widest opacity-80">For completing</p>
                <p className="mt-1 text-lg font-medium">{c.course}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4">
                <div className="text-xs text-muted-foreground">
                  <p>Issued {c.issued}</p>
                  <p className="font-mono">{c.credential}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => download(c)}>
                    <Download className="mr-1.5 h-4 w-4" /> Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${c.credential} · ${c.course}`);
                      toast.success("Share link copied");
                    }}
                  >
                    <Share2 className="mr-1.5 h-4 w-4" /> Share
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </RoleDashboardLayout>
  );
}
