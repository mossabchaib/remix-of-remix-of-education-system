import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Heart, ShoppingBag, PlayCircle } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { RemoveWishlistDialog } from "@/components/student/RemoveWishlistDialog";
import { courses } from "@/lib/mock-data";
import { WishlistService, EnrollmentService } from "@/services";
import { useWishlistIds, useEnrollmentIds } from "@/hooks/useStudentData";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Wishlist,
});

function Wishlist() {
  const ids = useWishlistIds();
  const enrolled = useEnrollmentIds();
  const navigate = useNavigate();
  const items = useMemo(() => courses.filter((c) => ids.includes(c.id)), [ids]);

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingCourse = useMemo(
    () => courses.find((c) => c.id === pendingRemoveId) ?? null,
    [pendingRemoveId]
  );

  const askRemove = (id: string) => {
    setPendingRemoveId(id);
    setDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!pendingRemoveId) return;
    WishlistService.remove(pendingRemoveId);
    toast.success("Removed from wishlist");
    setDialogOpen(false);
    setPendingRemoveId(null);
  };

  const buy = (id: string, price: number) => {
    if (price === 0) {
      // Free enroll → move directly to My Courses
      EnrollmentService.enroll(id);
      WishlistService.remove(id);
      toast.success("Enrolled — added to My Courses");
      navigate({ to: "/dashboard/student/courses" });
      return;
    }
    navigate({ to: "/checkout/$courseId", params: { courseId: id } });
  };

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Wishlist"
        description={`${items.length} course${items.length === 1 ? "" : "s"} saved for later.`}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save courses from the catalog to review them later."
          action={<Button asChild><Link to="/courses">Browse catalog</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => {
            const owned = enrolled.includes(c.id);
            return (
              <Card key={c.id} className="overflow-hidden border-border/60 p-0 shadow-card">
                <Link to="/courses/$id" params={{ id: c.id }} className="block h-28" style={{ backgroundImage: c.cover }} />
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.level}</Badge>
                    <Badge variant="outline" className="text-xs">{c.category}</Badge>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.teacher} · {c.price === 0 ? "Free" : `$${c.price}`}</p>
                  <div className="flex gap-2">
                    {owned ? (
                      <Button asChild className="flex-1">
                        <Link to="/dashboard/student/courses/$id" params={{ id: c.id }}>
                          <PlayCircle className="mr-1.5 h-4 w-4" /> Continue
                        </Link>
                      </Button>
                    ) : (
                      <Button className="flex-1" onClick={() => buy(c.id, c.price)}>
                        <ShoppingBag className="mr-1.5 h-4 w-4" /> {c.price === 0 ? "Enroll" : "Buy"}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => askRemove(c.id)} title="Remove">
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RemoveWishlistDialog
        courseTitle={pendingCourse?.title ?? null}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setPendingRemoveId(null);
        }}
        onConfirm={confirmRemove}
      />
    </RoleDashboardLayout>
  );
}