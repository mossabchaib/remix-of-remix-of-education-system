import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { XCircle, ArrowLeft, RefreshCcw } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOrder } from "@/lib/lms-storage";

export const Route = createFileRoute("/orders/$id/failed")({
  head: () => ({ meta: [{ title: "Payment failed — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Failed,
});

function Failed() {
  const { id } = Route.useParams();
  const order = typeof window !== "undefined" ? getOrder(id) : undefined;
  if (!order) throw notFound();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Card className="border-border/60 p-8 shadow-elegant text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Payment failed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn't process your payment for {order.courseTitle}. No charges were made.
          </p>
          <dl className="mt-6 grid gap-2 text-sm rounded-lg bg-muted/40 p-4 text-left">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Attempted amount</dt>
              <dd className="font-medium">${order.amount.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-mono text-xs">{order.txId}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/payment/$courseId" params={{ courseId: order.courseId }}>
                <RefreshCcw className="mr-1.5 h-4 w-4" /> Retry payment
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/courses/$id" params={{ id: order.courseId }}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to course
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}
